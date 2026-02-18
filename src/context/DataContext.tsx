import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Kid, Transaction, TransferInfo, AllowanceFrequency, TransactionCategory, SavingsGoal, KidRow, TransactionRow } from '../types';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import { processAllowances } from '../utils/allowance';
import { rowToKid, txRowToTransaction } from '../utils/transforms';

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

  const loadData = useCallback(async () => {
    if (!familyId) {
      setKids([]);
      setLoading(false);
      return;
    }

    if (isLoadingRef.current) {
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

      const { updated, changed, allowanceInfos } = processAllowances(loadedKids);

      setKids(changed ? updated : loadedKids);

      if (changed) {
        try {
          for (const kid of updated) {
            const original = loadedKids.find((k) => k.id === kid.id);
            if (original && kid.balance !== original.balance) {
              await supabase
                .from('kids')
                .update({
                  balance: kid.balance,
                  last_allowance_date: kid.lastAllowanceDate,
                })
                .eq('id', kid.id);

              const newTxs = kid.transactions.filter(
                (t) => !original.transactions.some((ot) => ot.id === t.id)
              );
              if (newTxs.length > 0) {
                await supabase.from('transactions').insert(
                  newTxs.map((t) => ({
                    id: t.id,
                    kid_id: kid.id,
                    type: t.type,
                    amount: t.amount,
                    description: t.description,
                    category: t.category,
                    date: t.date,
                  }))
                );
              }
            }
          }

          for (const info of allowanceInfos) {
            await addNotification({
              type: 'allowance_received',
              title: `Allowance for ${info.kidName}`,
              message: `${info.kidName} received $${info.totalAmount.toFixed(2)} in allowance.`,
              kidId: info.kidId,
              data: { amount: info.totalAmount },
            });
            const updatedKid = updated.find((k) => k.id === info.kidId);
            if (updatedKid) {
              await checkGoalMilestones(updatedKid, info.previousBalance);
            }
          }
        } catch (allowanceError) {
          console.error('Allowance processing error (UI already updated):', allowanceError);
        }
      }
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
  }, [familyId, addNotification, checkGoalMilestones]);

  useEffect(() => {
    if (session && familyId) {
      loadData();
    } else {
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
    await loadData();
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
      Alert.alert('Debug: No family', 'familyId is not set. Make sure you are logged in.');
      return null;
    }

    const balance = initialBalance && initialBalance > 0 ? initialBalance : 0;

    const { data: newKidRow, error } = await supabase
      .from('kids')
      .insert({
        family_id: familyId,
        name,
        avatar,
        allowance_amount: allowanceAmount,
        allowance_frequency: allowanceFrequency,
        balance,
      })
      .select()
      .single();

    if (error || !newKidRow) {
      console.error('Failed to add kid:', error?.message, error?.details, error?.hint);
      Alert.alert('Debug: Insert failed', error?.message ?? 'Unknown error');
      return null;
    }

    if (balance > 0) {
      await supabase.from('transactions').insert({
        kid_id: newKidRow.id,
        type: 'add',
        amount: balance,
        description: 'Initial balance',
        category: 'other',
        date: new Date().toISOString(),
      });
    }

    await loadData();
    return newKidRow.id as string;
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
        Alert.alert('Save Failed', errorMsg);
        throw new Error(errorMsg);
      }

      if (data && data !== 'OK') {
        const errorMsg = `Update returned: ${data}`;
        console.error('UPDATE FAILED:', errorMsg);
        Alert.alert('Save Failed', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Update successful!');
      await loadData();
    } catch (e: any) {
      console.error('EXCEPTION IN UPDATE:', e);
      const errorMsg = e?.message || String(e) || 'Unknown error';
      Alert.alert('Save Error', errorMsg);
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
        Alert.alert('Delete Failed', error.message || JSON.stringify(error));
        throw new Error(error.message);
      }

      console.log('Delete successful!');
      await loadData();
    } catch (e: any) {
      console.error('EXCEPTION IN DELETE:', e);
      Alert.alert('Delete Error', e?.message || String(e));
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
      Alert.alert('Error', 'Failed to update avatar: ' + error.message);
      throw error;
    }

    await loadData();
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
          Alert.alert(
            'Database Error',
            'The savings goal function is missing. Please run:\n\nsupabase/migrations/002_admin_functions.sql\n\nin Supabase SQL Editor.'
          );
        } else {
          Alert.alert('Error', 'Failed to update savings goal: ' + (error.message || error.code || 'Unknown error'));
        }
        throw error;
      }

      await loadData();
    } catch (e: any) {
      console.error('Exception in updateSavingsGoal:', e);
      if (!e.message?.includes('Database Error')) {
        Alert.alert('Error', `Failed to update: ${e?.message || String(e)}`);
      }
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

    const { data: txRow } = await supabase
      .from('transactions')
      .insert({
        kid_id: kidId,
        type,
        amount,
        description,
        category,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    const newBalance = type === 'add' ? previousBalance + amount : previousBalance - amount;
    await supabase
      .from('kids')
      .update({ balance: Math.round(newBalance * 100) / 100 })
      .eq('id', kidId);

    await loadData();

    try {
      const kidName = kid?.name ?? 'Unknown';
      const action = type === 'add' ? 'added to' : 'subtracted from';
      await addNotification({
        type: 'transaction_added',
        title: `Transaction ${type === 'add' ? 'Added' : 'Deducted'}`,
        message: `$${amount.toFixed(2)} ${action} ${kidName}'s account: ${description}`,
        kidId,
        data: { transactionId: txRow?.id, amount },
      });

      const updatedKid = kids.find((k) => k.id === kidId);
      if (updatedKid) {
        await checkGoalMilestones({ ...updatedKid, balance: Math.round(newBalance * 100) / 100 }, previousBalance);
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

    await supabase
      .from('transactions')
      .update({
        amount: updates.amount,
        description: updates.description,
        category: updates.category,
      })
      .eq('id', transactionId);

    const { data: allTxs } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('kid_id', kidId);

    const newBalance = (allTxs ?? []).reduce((sum: number, t: { type: string; amount: number }) => {
      const delta = t.type === 'add' ? Number(t.amount) : -Number(t.amount);
      return Math.round((sum + delta) * 100) / 100;
    }, 0);

    await supabase.from('kids').update({ balance: newBalance }).eq('id', kidId);
    await loadData();

    try {
      const kidName = kid?.name ?? 'Unknown';
      await addNotification({
        type: 'transaction_updated',
        title: 'Transaction Updated',
        message: `A transaction was updated for ${kidName}: ${updates.description}`,
        kidId,
        data: { transactionId, amount: updates.amount },
      });

      if (kid) {
        await checkGoalMilestones({ ...kid, balance: newBalance }, previousBalance);
      }
    } catch (notifError) {
      console.error('Post-update notification error:', notifError);
    }
  };

  const deleteTransaction = async (kidId: string, transactionId: string) => {
    const kid = kids.find((k) => k.id === kidId);
    const previousBalance = kid?.balance ?? 0;
    const deletedTx = kid?.transactions.find((t) => t.id === transactionId);

    await supabase.from('transactions').delete().eq('id', transactionId);

    const { data: allTxs } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('kid_id', kidId);

    const newBalance = (allTxs ?? []).reduce((sum: number, t: { type: string; amount: number }) => {
      const delta = t.type === 'add' ? Number(t.amount) : -Number(t.amount);
      return Math.round((sum + delta) * 100) / 100;
    }, 0);

    await supabase.from('kids').update({ balance: newBalance }).eq('id', kidId);
    await loadData();

    try {
      const kidName = kid?.name ?? 'Unknown';
      await addNotification({
        type: 'transaction_deleted',
        title: 'Transaction Deleted',
        message: `A $${deletedTx?.amount.toFixed(2) ?? '0.00'} transaction was removed from ${kidName}'s account.`,
        kidId,
        data: { transactionId, amount: deletedTx?.amount },
      });

      if (kid) {
        await checkGoalMilestones({ ...kid, balance: newBalance }, previousBalance);
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

    await loadData();

    try {
      await addNotification({
        type: 'transfer_received',
        title: `Transfer from ${sender.name}`,
        message: `${receiver.name} received $${amount.toFixed(2)} from ${sender.name}: ${description || ''}`,
        kidId: toKidId,
        data: { amount },
      });

      const updatedReceiver = { ...receiver, balance: Math.round((receiver.balance + amount) * 100) / 100 };
      const updatedSender = { ...sender, balance: Math.round((sender.balance - amount) * 100) / 100 };
      await checkGoalMilestones(updatedReceiver, receiver.balance);
      await checkGoalMilestones(updatedSender, sender.balance);
    } catch (notifError) {
      console.error('Post-transfer notification error (transfer succeeded):', notifError);
    }

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
