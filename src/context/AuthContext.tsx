import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { Profile, Family } from '../types';

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
  isPasswordRecovery: boolean;
  setupAdmin: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  addAdmin: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, password: string) => Promise<LoginResult>;
  loginKid: (email: string, password: string) => Promise<LoginResult>;
  createKidAuth: (kidId: string, name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateKidPassword: (kidId: string, name: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (displayName: string) => Promise<{ success: boolean; error?: string }>;
  clearPasswordRecovery: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BOOTSTRAP_TIMEOUT_MS = 15000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const ignoreAuthChanges = React.useRef(false);
  const bootstrapped = useRef(false);
  const inFlightProfile = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  const familyId = profile?.family_id ?? null;

  // Releases the initial full-screen loading gate. Safe to call from any code
  // path, so every branch can call it without worrying about double-clearing.
  const finishBootstrap = useCallback(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    setLoading(false);
  }, []);

  const fetchProfile = useCallback(async (userId: string, email?: string) => {
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
          email: email ?? '',
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

  // Sign-in and bootstrap can both ask for the same profile at once; sharing the
  // in-flight request avoids duplicate round trips on the login path.
  const loadProfile = useCallback(
    (userId: string, email?: string) => {
      const existing = inFlightProfile.current;
      if (existing?.userId === userId) return existing.promise;

      const promise = fetchProfile(userId, email).finally(() => {
        if (inFlightProfile.current?.promise === promise) {
          inFlightProfile.current = null;
        }
      });

      inFlightProfile.current = { userId, promise };
      return promise;
    },
    [fetchProfile]
  );

  useEffect(() => {
    let cancelled = false;

    const settle = () => {
      if (!cancelled) finishBootstrap();
    };

    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
        if (cancelled) return;
        setSession(currentSession);
        if (currentSession?.user) {
          await loadProfile(currentSession.user.id, currentSession.user.email ?? undefined);
        }
      })
      .catch((error) => {
        console.error('[auth] failed to restore session', error);
      })
      .finally(settle);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (ignoreAuthChanges.current) return;

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          setSession(newSession);
          settle();
          return;
        }

        setSession(newSession);

        if (!newSession?.user) {
          setProfile(null);
          setFamily(null);
          setUser(null);
          settle();
          return;
        }

        const { id, email } = newSession.user;

        // Supabase runs this callback while it still holds its internal auth
        // lock, and during startup before `initialize()` has resolved. Querying
        // Supabase from here would wait on that same lock and deadlock forever,
        // so the profile load is deferred to a later tick.
        setTimeout(() => {
          if (cancelled) return;
          loadProfile(id, email ?? undefined)
            .catch((error) => {
              console.error('[auth] failed to load profile', error);
            })
            .finally(settle);
        }, 0);
      }
    );

    // Last resort: never leave the app stuck behind the loading gate. If the
    // session resolves later, the route guards pick it up and redirect.
    const watchdog = setTimeout(() => {
      if (!bootstrapped.current) {
        console.warn('[auth] session restore timed out, continuing unauthenticated');
        settle();
      }
    }, BOOTSTRAP_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [loadProfile, finishBootstrap]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const extractSessionFromUrl = async (url: string) => {
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const params = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!error && type === 'recovery') {
        setIsPasswordRecovery(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) extractSessionFromUrl(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      extractSessionFromUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => sub.remove();
  }, []);

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

      // When email confirmation is enabled, signUp returns session: null.
      // Sign in explicitly so subsequent calls have a valid session.
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) return { success: false, error: signInError.message };
      }

      // Guarantee the family + profile exist with the correct display name.
      // The handle_new_user trigger should have created them, but if it
      // didn't fire (missing trigger, migration not applied, etc.) the
      // SECURITY DEFINER bootstrap_admin function creates them from scratch.
      const { data: bsResult, error: bsError } = await supabase.rpc(
        'bootstrap_admin',
        { p_display_name: displayName },
      );

      if (bsError) {
        return { success: false, error: bsError.message };
      }
      if (bsResult && bsResult !== 'OK') {
        return { success: false, error: String(bsResult) };
      }

      await loadProfile(data.user.id, email);
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

        // Reload own profile so deferred auth events from signUp/setSession
        // cannot leave the current admin's state stale
        if (adminSession?.user) {
          await loadProfile(adminSession.user.id, adminSession.user.email ?? undefined);
        }

        return { success: true };
      } finally {
        ignoreAuthChanges.current = false;
      }
    },
    [familyId, session, loadProfile]
  );

  const loginAdmin = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'Login failed' };

      await loadProfile(data.user.id, email);
      return { success: true, role: 'admin' };
    },
    [loadProfile]
  );

  const loginKid = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: 'Invalid email or password' };
      if (!data.user) return { success: false, error: 'Login failed' };

      await loadProfile(data.user.id, email);
      return { success: true, role: 'kid' };
    },
    [loadProfile]
  );

  const createKidAuth = useCallback(
    async (kidId: string, name: string, email: string, password: string) => {
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
              role: 'kid',
              display_name: name,
            },
          },
        });

        if (error) return { success: false, error: error.message };
        if (!data.user) return { success: false, error: 'Failed to create kid account' };

        if (adminSession) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
          if (sessionError) {
            return { success: false, error: 'Session expired. Please log out and log back in.' };
          }
        }

        const { data: linkResult, error: linkError } = await supabase.rpc('link_kid_user', {
          p_kid_id: kidId,
          p_user_id: data.user.id,
        });

        if (linkError) {
          return { success: false, error: linkError.message || 'Failed to link kid account' };
        }
        if (linkResult && linkResult !== 'OK') {
          return { success: false, error: String(linkResult) };
        }

        if (adminSession?.user) {
          await loadProfile(adminSession.user.id, adminSession.user.email ?? undefined);
        }

        return { success: true };
      } finally {
        ignoreAuthChanges.current = false;
      }
    },
    [familyId, session, loadProfile]
  );

  const updateKidPassword = useCallback(
    async (kidId: string, _name: string, newPassword: string) => {
      const { data, error } = await supabase.functions.invoke('update-kid-password', {
        body: { kid_id: kidId, new_password: newPassword },
      });

      if (error) {
        let message = 'Failed to update password';
        try {
          const body = typeof error.context?.json === 'function'
            ? await error.context.json()
            : null;
          if (body?.error) message = body.error;
        } catch {
          // context not available, use default message
        }
        return { success: false, error: message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      return { success: true };
    },
    []
  );

  const resetPassword = useCallback(
    async (email: string) => {
      const redirectTo =
        Platform.OS === 'web'
          ? `${window.location.origin}/(auth)/reset-password`
          : Linking.createURL('/(auth)/reset-password');

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    },
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      ignoreAuthChanges.current = true;
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) return { success: false, error: error.message };
        return { success: true };
      } finally {
        ignoreAuthChanges.current = false;
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (displayName: string) => {
      const trimmed = displayName.trim();
      if (!trimmed) return { success: false, error: 'Name cannot be empty' };
      if (!session?.user) return { success: false, error: 'Not authenticated' };

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', session.user.id);

      if (error) return { success: false, error: error.message };

      setProfile((prev) => prev ? { ...prev, display_name: trimmed } : prev);
      setUser((prev) =>
        prev?.role === 'admin' ? { ...prev, displayName: trimmed } : prev,
      );
      return { success: true };
    },
    [session],
  );

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // local-only sign-out should never fail, but clear state regardless
      }
    }
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
        isPasswordRecovery,
        setupAdmin,
        addAdmin,
        loginAdmin,
        loginKid,
        createKidAuth,
        updateKidPassword,
        resetPassword,
        updatePassword,
        updateProfile,
        clearPasswordRecovery,
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
