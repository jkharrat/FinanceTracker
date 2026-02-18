import React from 'react';
import { render } from '@testing-library/react-native';
import { KidCard } from '../components/KidCard';
import { TransactionItem } from '../components/TransactionItem';
import { EmptyState } from '../components/EmptyState';
import { Kid, Transaction } from '../types';

jest.mock('../context/ThemeContext', () => ({
  useColors: () => ({
    primary: '#6C63FF',
    primaryLight: '#8B85FF',
    primaryDark: '#4A42DB',
    success: '#34D399',
    successLight: '#D1FAE5',
    successDark: '#059669',
    danger: '#F87171',
    dangerLight: '#FEE2E2',
    dangerDark: '#DC2626',
    warning: '#FBBF24',
    warningLight: '#FEF3C7',
    background: '#F8F9FD',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F3F8',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    textWhite: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    shadow: 'rgba(108, 99, 255, 0.08)',
  }),
  useTheme: () => ({
    mode: 'light',
    setMode: jest.fn(),
    colors: {},
    isDark: false,
  }),
}));

function makeKid(overrides: Partial<Kid> = {}): Kid {
  return {
    id: 'kid-1',
    family_id: 'fam-1',
    name: 'Alice',
    avatar: '😊',
    password: '',
    allowanceAmount: 10,
    allowanceFrequency: 'weekly',
    balance: 42.50,
    transactions: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    lastAllowanceDate: null,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'add',
    amount: 25.00,
    description: 'Birthday money',
    category: 'gift',
    date: '2025-06-15T10:00:00.000Z',
    ...overrides,
  };
}

// ─── KidCard ─────────────────────────────────────────────────────────────

describe('KidCard', () => {
  it('renders kid name', () => {
    const { getByText } = render(
      <KidCard kid={makeKid()} onPress={jest.fn()} />
    );
    expect(getByText('Alice')).toBeTruthy();
  });

  it('renders kid avatar', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ avatar: '🚀' })} onPress={jest.fn()} />
    );
    expect(getByText('🚀')).toBeTruthy();
  });

  it('renders balance formatted as currency', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ balance: 42.50 })} onPress={jest.fn()} />
    );
    expect(getByText('$42.50')).toBeTruthy();
  });

  it('renders allowance amount with frequency', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ allowanceAmount: 10, allowanceFrequency: 'weekly' })} onPress={jest.fn()} />
    );
    expect(getByText('$10.00 Weekly')).toBeTruthy();
  });

  it('renders monthly allowance frequency', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ allowanceAmount: 50, allowanceFrequency: 'monthly' })} onPress={jest.fn()} />
    );
    expect(getByText('$50.00 Monthly')).toBeTruthy();
  });

  it('renders negative balance correctly', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ balance: -15.75 })} onPress={jest.fn()} />
    );
    expect(getByText('-$15.75')).toBeTruthy();
  });

  it('renders savings goal when present', () => {
    const kid = makeKid({
      balance: 50,
      savingsGoal: { name: 'Bicycle', targetAmount: 100 },
    });
    const { getByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(getByText('Bicycle')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
  });

  it('does not render savings goal when absent', () => {
    const kid = makeKid({ savingsGoal: undefined });
    const { queryByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(queryByText('0%')).toBeNull();
  });

  it('caps progress at 100%', () => {
    const kid = makeKid({
      balance: 200,
      savingsGoal: { name: 'Toy', targetAmount: 100 },
    });
    const { getByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(getByText('100%')).toBeTruthy();
  });

  it('shows 0% progress when balance is 0', () => {
    const kid = makeKid({
      balance: 0,
      savingsGoal: { name: 'Game', targetAmount: 50 },
    });
    const { getByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(getByText('0%')).toBeTruthy();
  });

  it('renders "Balance" label', () => {
    const { getByText } = render(
      <KidCard kid={makeKid()} onPress={jest.fn()} />
    );
    expect(getByText('Balance')).toBeTruthy();
  });

  it('shows goal amounts correctly', () => {
    const kid = makeKid({
      balance: 35,
      savingsGoal: { name: 'Bike', targetAmount: 100 },
    });
    const { getByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(getByText('$35.00 of $100.00')).toBeTruthy();
  });
});

// ─── TransactionItem ─────────────────────────────────────────────────────

describe('TransactionItem', () => {
  it('renders transaction description', () => {
    const { getByText } = render(
      <TransactionItem transaction={makeTx()} />
    );
    expect(getByText('Birthday money')).toBeTruthy();
  });

  it('renders add transaction with + prefix', () => {
    const { getByText } = render(
      <TransactionItem transaction={makeTx({ type: 'add', amount: 25 })} />
    );
    expect(getByText('+$25.00')).toBeTruthy();
  });

  it('renders subtract transaction with - prefix', () => {
    const { getByText } = render(
      <TransactionItem transaction={makeTx({ type: 'subtract', amount: 10 })} />
    );
    expect(getByText('-$10.00')).toBeTruthy();
  });

  it('renders category badge', () => {
    const { getByText } = render(
      <TransactionItem transaction={makeTx({ category: 'gift' })} />
    );
    expect(getByText('Gift')).toBeTruthy();
    expect(getByText('🎁')).toBeTruthy();
  });

  it('renders food category', () => {
    const { getByText } = render(
      <TransactionItem transaction={makeTx({ category: 'food' })} />
    );
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('🍔')).toBeTruthy();
  });

  it('renders transfer label for received transfer', () => {
    const tx = makeTx({
      type: 'add',
      transfer: {
        transferId: 't-1',
        fromKidId: 'k-2',
        toKidId: 'k-1',
        fromKidName: 'Bob',
        toKidName: 'Alice',
      },
    });
    const { getByText } = render(
      <TransactionItem transaction={tx} />
    );
    expect(getByText('Received from Bob')).toBeTruthy();
  });

  it('renders transfer label for sent transfer', () => {
    const tx = makeTx({
      type: 'subtract',
      transfer: {
        transferId: 't-1',
        fromKidId: 'k-1',
        toKidId: 'k-2',
        fromKidName: 'Alice',
        toKidName: 'Bob',
      },
    });
    const { getByText } = render(
      <TransactionItem transaction={tx} />
    );
    expect(getByText('Sent to Bob')).toBeTruthy();
  });

  it('renders formatted date', () => {
    const { getByText } = render(
      <TransactionItem transaction={makeTx({ date: '2025-06-15T10:00:00.000Z' })} />
    );
    const dateElement = getByText(/Jun/);
    expect(dateElement).toBeTruthy();
  });
});

// ─── EmptyState ──────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders icon', () => {
    const { getByText } = render(
      <EmptyState icon="💰" title="No Kids" subtitle="Add your first kid" />
    );
    expect(getByText('💰')).toBeTruthy();
  });

  it('renders title', () => {
    const { getByText } = render(
      <EmptyState icon="📊" title="No Data Yet" subtitle="Stats will appear soon" />
    );
    expect(getByText('No Data Yet')).toBeTruthy();
  });

  it('renders subtitle', () => {
    const { getByText } = render(
      <EmptyState icon="🔔" title="No Notifications" subtitle="You're all caught up!" />
    );
    expect(getByText("You're all caught up!")).toBeTruthy();
  });
});
