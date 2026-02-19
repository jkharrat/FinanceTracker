import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Kid, Transaction, TransferInfo, AllowanceFrequency, TransactionCategory, SavingsGoal, KidRow, TransactionRow } from '../types';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import { rowToKid, txRowToTransaction } from '../utils/transforms';

const TRANSFER_FLAVORS = [
  'Nice one!',
  'Sharing is caring!',
  'How generous!',
  'What a kind gesture!',
  'Teamwork makes the dream work!',
  'That was thoughtful!',
  'Way to go!',
  'What a great move!',
];

function randomFlavor(): string {
  return TRANSFER_FLAVORS[Math.floor(Math.random() * TRANSFER_FLAVORS.length)];
}

function goalProgressSnippet(kid: Kid, balance: number): string {
  if (!kid.savingsGoal || kid.savingsGoal.targetAmount <= 0) return '';
  const pct = Math.min(100, Math.round((balance / kid.savingsGoal.targetAmount) * 100));
  return ` · ${pct}% toward "${kid.savingsGoal.name}"`;
}

interface DataContextType {
  kids: Kid[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addKid: (name: string, avatar: string, allowanceAmount: number, allowanceFrequency: AllowanceFrequency, password: string, initialBalance?: number) => Promise<string | null>;
  updateKid: (id: string, name: string, avatar: string, allowanceAmount: number, allowanceFrequency: AllowanceFrequency, password?: string, savingsGoal?: SavingsGoal | null) => Promise<void>;
  deleteKid: (id: string) => Promise<void>;
  addTransaction: (kidId: string, type: 'add' | 'subtract', amount: number, description: string, category: TransactionCategory) => Promise<void>;
  updateTransaction: (kidId: string, transactionId: string, updates: { amount: number; description: string; category: TransactionCategory }) => Promise<void>;
  deleteTransaction: (kidId: string, transactionId: string) => Promise<void>;
  updateKidAvatar: (id: string, avatar: string) => Promise<void>;
  updateSavingsGoal: (id: string, savingsGoal: SavingsGoal | null) => Promise<void>;
  transferMoney: (fromKidId: string, toKidId: string, amount: number, description: string) => Promise<{ success: boolean; error?: string }>;
  getKid: (id: string) => Kid | undefined;
  isNameUnique: (name: string, excludeId?: string) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification, checkGoalMilestones } = useNotifications();
  const { familyId, session } = useAuth();
  const isLoadingRef = useRef(false);
  const pendingReloadRef = useRef(false);
  const kidsRef = useRef<Kid[]>([]);

  const loadData = useCallback(async (force = false) => {
    if (!familyId) {
      kidsRef.current = [];
      setKids([]);
      setLoading(false);
      return;
    }

    if (isLoadingRef.current && !force) {
      pendingReloadRef.current = true;
      return;
    }
    isLoadingRef.current = true;

    try {
      const { data: kidRows, error: kidError } = await supabase
        .from('kids')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (kidError) throw kidError;
      if (!kidRows || kidRows.length === 0) {
        kidsRef.current = [];
        setKids([]);
        return;
      }

      const kidIds = kidRows.map((k: KidRow) => k.id);

      const { data: txRows, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .in('kid_id', kidIds)
        .order('date', { ascending: false });

      if (txError) throw txError;

      const txByKid: Record<string, Transaction[]> = {};
      for (const row of (txRows ?? []) as TransactionRow[]) {
        if (!txByKid[row.kid_id]) txByKid[row.kid_id] = [];
        txByKid[row.kid_id].push(txRowToTransaction(row));
      }

      const loadedKids = (kidRows as KidRow[]).map((row) =>
        rowToKid(row, txByKid[row.id] ?? [])
      );

      kidsRef.current = loadedKids;
      setKids(loadedKids);
    } catch (error: any) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        loadData();
      }
    }
  }, [familyId]);

  useEffect(() => {
    if (session && familyId) {
      loadData();
    } else {
      kidsRef.current = [];
      setKids([]);
      setLoading(false);
    }
  }, [session, familyId, loadData]);

  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedReload = useCallback(() => {
    if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = setTimeout(() => {
      loadDataRef.current();
    }, 500);
  }, []);

  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`family-data-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kids', filter: `family_id=eq.${familyId}` },
        debouncedReload,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        debouncedReload,
      )
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [familyId, debouncedReload]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          loadDataRef.current();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadDataRef.current();
      }
    });

    return () => subscription.remove();
  }, []);

  const refreshData = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const addKid = async (
    name: string,
    avatar: string,
    allowanceAmount: number,
    allowanceFrequency: AllowanceFrequency,
    _password: string,
    initialBalance?: number
  ): Promise<string | null> => {
    if (!familyId) {
      console.error('addKid: No familyId available');
      return null;
    }

    const balance = initialBalance && initialBalance > 0 ? initialBalance : 0;

    const { data, error } = await supabase.rpc('add_kid_safe', {
      p_family_id: familyId,
      p_name: name,
      p_avatar: avatar,
      p_allowance_amount: allowanceAmount,
      p_allowance_frequency: allowanceFrequency,
      p_initial_balance: balance,
    });

    if (error) {
      console.error('Failed to add kid:', error.message, error.details, error.hint);
      return null;
    }

    if (!data || data === 'Profile not found. Please log out and log back in.' ||
        data === 'Only parents can add kids' || data === 'Family mismatch') {
      console.error('add_kid_safe returned:', data);
      return null;
    }

    const kidId = data as string;
    await loadData(true);
    return kidId;
  };

  const updateKid = async (
    id: string,
    name: string,
    avatar: string,
    allowanceAmount: number,
    allowanceFrequency: AllowanceFrequency,
    _password?: string,
    savingsGoal?: SavingsGoal | null
  ) => {
    console.log('=== UPDATE KID START ===');
    console.log('Kid ID:', id);
    
    try {
      const { data, error } = await supabase.rpc('update_kid_safe', {
        p_kid_id: id,
        p_name: name,
        p_avatar: avatar,
        p_allowance_amount: allowanceAmount,
        p_allowance_frequency: allowanceFrequency,
        p_savings_goal_name: savingsGoal?.name ?? null,
        p_savings_goal_target: savingsGoal?.targetAmount ?? null,
      });

      console.log('RPC Response - data:', data);
      console.log('RPC Response - error:', error);

      if (error) {
        const errorMsg = `RPC Error: ${error.message || error.code || JSON.stringify(error)}`;
        console.error('UPDATE FAILED:', errorMsg);
        throw new Error(errorMsg);
      }

      if (data && data !== 'OK') {
        const errorMsg = `Update returned: ${data}`;
        console.error('UPDATE FAILED:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Update successful!');
      await loadData(true);
    } catch (e: any) {
      console.error('EXCEPTION IN UPDATE:', e);
      const errorMsg = e?.message || String(e) || 'Unknown error';
      console.error('SAVE ERROR:', errorMsg);
      throw e;
    }
  };

  const deleteKid = async (id: string) => {
    console.log('=== DELETE KID START ===', id);
    try {
      // Delete directly via REST (RLS allows admins to delete their family's kids)
      const { error } = await supabase
        .from('kids')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        console.error('DELETE FAILED:', error);
        throw new Error(error.message);
      }

      console.log('Delete successful!');
      await loadData(true);
    } catch (e: any) {
      console.error('EXCEPTION IN DELETE:', e);
      throw e;
    }
  };

  const updateKidAvatar = async (id: string, avatar: string) => {
    const { error } = await supabase.rpc('update_kid_avatar_safe', {
      p_kid_id: id,
      p_avatar: avatar,
    });

    if (error) {
      console.error('Failed to update avatar:', error);
      throw error;
    }

    await loadData(true);
  };

  const updateSavingsGoal = async (id: string, savingsGoal: SavingsGoal | null) => {
    try {
      console.log('Updating savings goal for kid:', id);
      const { error } = await supabase.rpc('update_savings_goal_safe', {
        p_kid_id: id,
        p_savings_goal_name: savingsGoal?.name ?? null,
        p_savings_goal_target: savingsGoal?.targetAmount ?? null,
      });

      if (error) {
        console.error('RPC savings goal error:', error);
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          console.error('The savings goal function is missing. Run supabase/migrations/002_admin_functions.sql');
        }
        throw error;
      }

      await loadData(true);
    } catch (e: any) {
      console.error('Exception in updateSavingsGoal:', e);
      throw e;
    }
  };

  const addTransaction = async (
    kidId: string,
    type: 'add' | 'subtract',
    amount: number,
    description: string,
    category: TransactionCategory
  ) => {
    const kid = kids.find((k) => k.id === kidId);
    const previousBalance = kid?.balance ?? 0;

    const { data, error } = await supabase.rpc('add_transaction_safe', {
      p_kid_id: kidId,
      p_type: type,
      p_amount: amount,
      p_description: description,
      p_category: category,
    });

    if (error) {
      console.error('add_transaction_safe RPC error:', error);
      throw new Error(error.message || 'Transaction failed');
    }

    if (data && data !== 'OK') {
      console.error('add_transaction_safe returned:', data);
      throw new Error(String(data));
    }

    const newBalance = type === 'add' ? previousBalance + amount : previousBalance - amount;
    await loadData(true);

    try {
      const kidName = kid?.name ?? 'Unknown';
      const roundedBalance = Math.round(newBalance * 100) / 100;
      const actionWord = type === 'add' ? 'Added to' : 'Deducted from';
      const goalLine = kid ? goalProgressSnippet(kid, roundedBalance) : '';
      await addNotification({
        type: 'transaction_added',
        title: `$${amount.toFixed(2)} ${actionWord} ${kidName}'s Account`,
        message: `${description} · New balance: $${roundedBalance.toFixed(2)}${goalLine}`,
        kidId,
        data: { amount },
      }, { skipLocalPush: true });

      const updatedKid = kidsRef.current.find((k) => k.id === kidId);
      if (updatedKid) {
        await checkGoalMilestones(updatedKid, previousBalance);
      }
    } catch (notifError) {
      console.error('Post-transaction notification error:', notifError);
    }
  };

  const updateTransaction = async (
    kidId: string,
    transactionId: string,
    updates: { amount: number; description: string; category: TransactionCategory }
  ) => {
    const kid = kids.find((k) => k.id === kidId);
    const previousBalance = kid?.balance ?? 0;

    const { data, error } = await supabase.rpc('update_transaction_safe', {
      p_transaction_id: transactionId,
      p_amount: updates.amount,
      p_description: updates.description,
      p_category: updates.category,
    });

    if (error) throw new Error(error.message || 'Failed to update transaction');
    if (data && data !== 'OK') throw new Error(String(data));

    await loadData(true);

    try {
      const kidName = kid?.name ?? 'Unknown';
      await addNotification({
        type: 'transaction_updated',
        title: `Transaction Updated for ${kidName}`,
        message: `${updates.description} · $${updates.amount.toFixed(2)}`,
        kidId,
        data: { transactionId, amount: updates.amount },
      }, { skipLocalPush: true });

      const updatedKid = kidsRef.current.find((k) => k.id === kidId);
      if (updatedKid) {
        await checkGoalMilestones(updatedKid, previousBalance);
      }
    } catch (notifError) {
      console.error('Post-update notification error:', notifError);
    }
  };

  const deleteTransaction = async (kidId: string, transactionId: string) => {
    const kid = kids.find((k) => k.id === kidId);
    const previousBalance = kid?.balance ?? 0;
    const deletedTx = kid?.transactions.find((t) => t.id === transactionId);

    const { data, error } = await supabase.rpc('delete_transaction_safe', {
      p_transaction_id: transactionId,
    });

    if (error) throw new Error(error.message || 'Failed to delete transaction');
    if (data && data !== 'OK') throw new Error(String(data));

    await loadData(true);

    try {
      const kidName = kid?.name ?? 'Unknown';
      await addNotification({
        type: 'transaction_deleted',
        title: `Transaction Removed from ${kidName}'s Account`,
        message: `$${deletedTx?.amount.toFixed(2) ?? '0.00'} removed`,
        kidId,
        data: { transactionId, amount: deletedTx?.amount },
      }, { skipLocalPush: true });

      const updatedKid = kidsRef.current.find((k) => k.id === kidId);
      if (updatedKid) {
        await checkGoalMilestones(updatedKid, previousBalance);
      }
    } catch (notifError) {
      console.error('Post-delete notification error:', notifError);
    }
  };

  const transferMoney = async (
    fromKidId: string,
    toKidId: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; error?: string }> => {
    const sender = kids.find((k) => k.id === fromKidId);
    const receiver = kids.find((k) => k.id === toKidId);

    if (!sender) return { success: false, error: 'Sender not found' };
    if (!receiver) return { success: false, error: 'Recipient not found' };
    if (amount <= 0) return { success: false, error: 'Amount must be greater than zero' };
    if (sender.balance < amount) return { success: false, error: 'Insufficient balance' };

    try {
      const { data, error } = await supabase.rpc('do_transfer', {
        p_from_kid_id: fromKidId,
        p_to_kid_id: toKidId,
        p_amount: amount,
        p_description: description || `Transfer to ${receiver.name}`,
      });

      if (error) {
        return { success: false, error: error.message || 'Transfer failed' };
      }
      if (data && data !== 'OK') {
        return { success: false, error: String(data) };
      }
    } catch (rpcError: any) {
      return { success: false, error: rpcError?.message || 'Transfer failed' };
    }

    const previousSenderBalance = sender.balance;
    const previousReceiverBalance = receiver.balance;
    await loadData(true);

    (async () => {
      try {
        const freshReceiver = kidsRef.current.find((k) => k.id === toKidId);
        const freshSender = kidsRef.current.find((k) => k.id === fromKidId);
        const receiverBalance = freshReceiver?.balance ?? Math.round((previousReceiverBalance + amount) * 100) / 100;
        const flavorOrDesc = description ? `"${description}"` : randomFlavor();
        await addNotification({
          type: 'transfer_received',
          title: `Transfer from ${sender.name} to ${receiver.name}`,
          message: `$${amount.toFixed(2)} received · ${flavorOrDesc} · Balance: $${receiverBalance.toFixed(2)}`,
          kidId: toKidId,
          data: { amount },
        }, { skipLocalPush: true });

        if (freshReceiver) {
          await checkGoalMilestones(freshReceiver, previousReceiverBalance);
        }
        if (freshSender) {
          await checkGoalMilestones(freshSender, previousSenderBalance);
        }
      } catch (notifError) {
        console.error('Post-transfer notification error (transfer succeeded):', notifError);
      }
    })();

    return { success: true };
  };

  const getKid = useCallback(
    (id: string) => kids.find((kid) => kid.id === id),
    [kids]
  );

  const isNameUnique = useCallback(
    (name: string, excludeId?: string) =>
      !kids.some(
        (kid) => kid.name.toLowerCase() === name.toLowerCase() && kid.id !== excludeId
      ),
    [kids]
  );

  return (
    <DataContext.Provider
      value={{
        kids,
        loading,
        refreshData,
        addKid,
        updateKid,
        deleteKid,
        updateKidAvatar,
        updateSavingsGoal,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        transferMoney,
        getKid,
        isNameUnique,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
