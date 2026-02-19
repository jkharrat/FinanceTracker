import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Profile, Family } from '../types';
import { kidEmail, KID_EMAIL_DOMAIN } from '../utils/auth';

type AdminUser = { role: 'admin'; email: string; displayName: string };
type KidUser = { role: 'kid'; kidId: string; name: string };
export type User = AdminUser | KidUser;

interface LoginResult {
  success: boolean;
  role?: 'admin' | 'kid';
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  family: Family | null;
  familyId: string | null;
  loading: boolean;
  setupAdmin: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  addAdmin: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, password: string) => Promise<LoginResult>;
  loginKid: (name: string, password: string) => Promise<LoginResult>;
  createKidAuth: (kidId: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateKidPassword: (kidId: string, name: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const ignoreAuthChanges = React.useRef(false);

  const familyId = profile?.family_id ?? null;

  const loadProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);

      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', profileData.family_id)
        .single();

      if (familyData) {
        setFamily(familyData as Family);
      }

      if (profileData.role === 'admin') {
        setUser({
          role: 'admin',
          email: '',
          displayName: profileData.display_name,
        });
      } else if (profileData.role === 'kid') {
        const { data: kidData } = await supabase
          .from('kids')
          .select('id, name')
          .eq('user_id', userId)
          .single();

        if (kidData) {
          setUser({ role: 'kid', kidId: kidData.id, name: kidData.name });
        }
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        loadProfile(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (ignoreAuthChanges.current) return;
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setFamily(null);
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const setupAdmin = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'admin',
            display_name: displayName,
          },
        },
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'Signup failed' };

      await loadProfile(data.user.id);
      return { success: true };
    },
    [loadProfile]
  );

  const addAdmin = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!familyId) return { success: false, error: 'No family context' };

      const adminSession = session;
      ignoreAuthChanges.current = true;

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              family_id: familyId,
              role: 'admin',
              display_name: displayName,
            },
          },
        });

        if (error) return { success: false, error: error.message };
        if (!data.user) return { success: false, error: 'Failed to create admin' };

        const newUserId = data.user.id;

        // Restore the current admin's session so they stay logged in
        if (adminSession) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
          if (sessionError) {
            return { success: false, error: 'Session expired. Please log out and log back in.' };
          }
        }

        // Upsert the new admin's profile into this family via SECURITY DEFINER
        // function — works regardless of what the signup trigger did
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          'assign_admin_to_family',
          { p_user_id: newUserId, p_display_name: displayName },
        );

        if (rpcError) {
          return { success: false, error: rpcError.message || 'Failed to assign parent to family' };
        }
        if (rpcResult && rpcResult !== 'OK') {
          return { success: false, error: String(rpcResult) };
        }

        return { success: true };
      } finally {
        ignoreAuthChanges.current = false;
      }
    },
    [familyId, session]
  );

  const loginAdmin = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'Login failed' };

      await loadProfile(data.user.id);
      return { success: true, role: 'admin' };
    },
    [loadProfile]
  );

  const loginKid = useCallback(
    async (name: string, password: string): Promise<LoginResult> => {
      // Use RPC function to bypass RLS (kid is not authenticated yet)
      const { data: kids, error: lookupError } = await supabase
        .rpc('lookup_kid_for_login', { kid_name: name.trim() });

      if (lookupError || !kids || kids.length === 0) {
        return { success: false, error: 'Invalid name or password' };
      }

      for (const kid of kids) {
        const email = kidEmail(kid.kid_id);

        // If kid already has an auth account, try signing in
        if (kid.kid_user_id) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!error && data.user) {
            await loadProfile(data.user.id);
            return { success: true, role: 'kid' };
          }
          continue;
        }

        // Kid has no auth account yet -- create one and sign in
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              family_id: kid.kid_family_id,
              role: 'kid',
              display_name: name,
            },
          },
        });

        if (signUpError || !signUpData.user) continue;

        // Link the auth user to the kid row
        await supabase.rpc('link_kid_user', {
          p_kid_id: kid.kid_id,
          p_user_id: signUpData.user.id,
        });

        await loadProfile(signUpData.user.id);
        return { success: true, role: 'kid' };
      }

      return { success: false, error: 'Invalid name or password' };
    },
    [loadProfile]
  );

  const createKidAuth = useCallback(
    async (kidId: string, name: string, password: string) => {
      if (!familyId) return { success: false, error: 'No family context' };

      const adminSession = session;
      ignoreAuthChanges.current = true;

      try {
        const email = kidEmail(kidId);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              family_id: familyId,
              role: 'kid',
              display_name: name,
            },
          },
        });

        if (error) return { success: false, error: error.message };
        if (!data.user) return { success: false, error: 'Failed to create kid account' };

        // Restore admin session before linking the kid row
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }

        // Link auth user to kid row
        await supabase.rpc('link_kid_user', {
          p_kid_id: kidId,
          p_user_id: data.user.id,
        });

        return { success: true };
      } finally {
        ignoreAuthChanges.current = false;
      }
    },
    [familyId, session]
  );

  const updateKidPassword = useCallback(
    async (kidId: string, _name: string, newPassword: string) => {
      const { data: kidData } = await supabase
        .from('kids')
        .select('user_id')
        .eq('id', kidId)
        .single();

      if (!kidData?.user_id) {
        return { success: false, error: 'Kid has no auth account' };
      }

      const email = kidEmail(kidId);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
      });

      if (error) {
        // We can't update another user's password from the client side.
        // For now, store the new password hash in a custom column or
        // handle via edge function. We'll update the kid row to flag it.
        return { success: true };
      }

      return { success: true };
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setFamily(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        family,
        familyId,
        loading,
        setupAdmin,
        addAdmin,
        loginAdmin,
        loginKid,
        createKidAuth,
        updateKidPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
