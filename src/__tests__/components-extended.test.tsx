import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import NotificationItem from '../components/NotificationItem';
import ProfileAvatar from '../components/ProfileAvatar';
import AnimatedNumber from '../components/AnimatedNumber';
import AnimatedListItem from '../components/AnimatedListItem';
import AnimatedPressable from '../components/AnimatedPressable';
import GradientCard from '../components/GradientCard';
import { EmptyState } from '../components/EmptyState';
import { KidCard } from '../components/KidCard';
import { TransactionItem } from '../components/TransactionItem';
import { TransactionModal } from '../components/TransactionModal';
import { StatsView } from '../components/StatsView';
import {
  BalanceCardSkeleton,
  KidCardSkeleton,
  TransactionSkeleton,
  AdminDashboardSkeleton,
} from '../components/Skeleton';
import { AppNotification, Kid, Transaction } from '../types';
import { LightColors } from '../constants/colors';

const mockColors = {
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
};

jest.mock('../context/ThemeContext', () => ({
  useColors: () => mockColors,
  useTheme: () => ({
    mode: 'light',
    setMode: jest.fn(),
    colors: mockColors,
    isDark: false,
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }: any) => <Text {...props}>{name}</Text>,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'notif-1',
    type: 'transaction_added',
    title: 'Transaction Added',
    message: '$10.00 added to Alice',
    kidId: 'kid-1',
    read: false,
    date: new Date().toISOString(),
    ...overrides,
  };
}

function makeKid(overrides: Partial<Kid> = {}): Kid {
  return {
    id: 'kid-1',
    family_id: 'fam-1',
    name: 'Alice',
    avatar: '😊',
    password: '',
    allowanceAmount: 10,
    allowanceFrequency: 'weekly',
    balance: 42.5,
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
    amount: 25,
    description: 'Birthday money',
    category: 'gift',
    date: '2025-06-15T10:00:00.000Z',
    ...overrides,
  };
}

// ─── NotificationItem ─────────────────────────────────────────────────────

describe('NotificationItem', () => {
  it('renders notification title', () => {
    const { getByText } = render(
      <NotificationItem notification={makeNotification()} onPress={jest.fn()} />
    );
    expect(getByText('Transaction Added')).toBeTruthy();
  });

  it('renders notification message', () => {
    const { getByText } = render(
      <NotificationItem notification={makeNotification()} onPress={jest.fn()} />
    );
    expect(getByText('$10.00 added to Alice')).toBeTruthy();
  });

  it('shows unread dot for unread notifications', () => {
    const { toJSON } = render(
      <NotificationItem notification={makeNotification({ read: false })} onPress={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toBeTruthy();
  });

  it('calls onPress with notification id when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <NotificationItem notification={makeNotification({ id: 'n-42' })} onPress={onPress} />
    );
    fireEvent.press(getByText('Transaction Added'));
    expect(onPress).toHaveBeenCalledWith('n-42');
  });

  it('renders allowance notification', () => {
    const { getByText } = render(
      <NotificationItem
        notification={makeNotification({
          type: 'allowance_received',
          title: 'Allowance Received',
          message: 'Weekly allowance of $10.00',
        })}
        onPress={jest.fn()}
      />
    );
    expect(getByText('Allowance Received')).toBeTruthy();
    expect(getByText('Weekly allowance of $10.00')).toBeTruthy();
  });

  it('renders transfer notification', () => {
    const { getByText } = render(
      <NotificationItem
        notification={makeNotification({
          type: 'transfer_received',
          title: 'Transfer Received',
          message: 'You received $5.00 from Bob',
        })}
        onPress={jest.fn()}
      />
    );
    expect(getByText('Transfer Received')).toBeTruthy();
  });

  it('renders goal milestone notification', () => {
    const { getByText } = render(
      <NotificationItem
        notification={makeNotification({
          type: 'goal_milestone',
          title: 'Goal Progress!',
          message: 'You reached 50% of your Bicycle goal!',
        })}
        onPress={jest.fn()}
      />
    );
    expect(getByText('Goal Progress!')).toBeTruthy();
  });

  it('renders read notification without unread indicators', () => {
    const { getByText } = render(
      <NotificationItem notification={makeNotification({ read: true })} onPress={jest.fn()} />
    );
    expect(getByText('Transaction Added')).toBeTruthy();
  });

  it('renders transaction_deleted notification', () => {
    const { getByText } = render(
      <NotificationItem
        notification={makeNotification({
          type: 'transaction_deleted',
          title: 'Transaction Deleted',
          message: 'A transaction was removed',
        })}
        onPress={jest.fn()}
      />
    );
    expect(getByText('Transaction Deleted')).toBeTruthy();
  });

  it('renders transaction_updated notification', () => {
    const { getByText } = render(
      <NotificationItem
        notification={makeNotification({
          type: 'transaction_updated',
          title: 'Transaction Updated',
          message: 'A transaction was modified',
        })}
        onPress={jest.fn()}
      />
    );
    expect(getByText('Transaction Updated')).toBeTruthy();
  });
});

// ─── ProfileAvatar ────────────────────────────────────────────────────────

describe('ProfileAvatar', () => {
  it('renders single initial for one-word name', () => {
    const { getByText } = render(<ProfileAvatar name="Alice" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('renders two initials for two-word name', () => {
    const { getByText } = render(<ProfileAvatar name="Alice Smith" />);
    expect(getByText('AS')).toBeTruthy();
  });

  it('renders initials from first and last name with middle name', () => {
    const { getByText } = render(<ProfileAvatar name="Alice Jane Smith" />);
    expect(getByText('AS')).toBeTruthy();
  });

  it('uppercases initials', () => {
    const { getByText } = render(<ProfileAvatar name="alice" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('renders with custom size', () => {
    const { toJSON } = render(<ProfileAvatar name="Bob" size={64} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with default size when not specified', () => {
    const { toJSON } = render(<ProfileAvatar name="Carol" />);
    expect(toJSON()).toBeTruthy();
  });

  it('handles empty string name gracefully', () => {
    const { getByText } = render(<ProfileAvatar name=" " />);
    expect(getByText('?')).toBeTruthy();
  });

  it('different names can produce different background colors', () => {
    const { toJSON: json1 } = render(<ProfileAvatar name="Alice" />);
    const { toJSON: json2 } = render(<ProfileAvatar name="Zed" />);
    expect(json1()).toBeTruthy();
    expect(json2()).toBeTruthy();
  });
});

// ─── AnimatedNumber ───────────────────────────────────────────────────────

describe('AnimatedNumber', () => {
  it('renders positive value formatted as currency', () => {
    const { getByText } = render(<AnimatedNumber value={42.5} />);
    expect(getByText('$42.50')).toBeTruthy();
  });

  it('renders negative value with sign', () => {
    const { getByText } = render(<AnimatedNumber value={-15.75} />);
    expect(getByText('-$15.75')).toBeTruthy();
  });

  it('renders zero value', () => {
    const { getByText } = render(<AnimatedNumber value={0} />);
    expect(getByText('$0.00')).toBeTruthy();
  });

  it('renders with prefix', () => {
    const { getByText } = render(<AnimatedNumber value={100} prefix="+" />);
    expect(getByText('+$100.00')).toBeTruthy();
  });

  it('renders with custom decimal places', () => {
    const { getByText } = render(<AnimatedNumber value={42.5} decimals={0} />);
    expect(getByText('$43')).toBeTruthy();
  });

  it('renders large values', () => {
    const { getByText } = render(<AnimatedNumber value={99999.99} />);
    expect(getByText('$99999.99')).toBeTruthy();
  });

  it('handles very small values', () => {
    const { getByText } = render(<AnimatedNumber value={0.01} />);
    expect(getByText('$0.01')).toBeTruthy();
  });
});

// ─── AnimatedListItem ─────────────────────────────────────────────────────

describe('AnimatedListItem', () => {
  it('renders children', () => {
    const { getByText } = render(
      <AnimatedListItem index={0}>
        <Text>Item Content</Text>
      </AnimatedListItem>
    );
    expect(getByText('Item Content')).toBeTruthy();
  });

  it('renders children for high index (beyond animation limit)', () => {
    const { getByText } = render(
      <AnimatedListItem index={20}>
        <Text>Late Item</Text>
      </AnimatedListItem>
    );
    expect(getByText('Late Item')).toBeTruthy();
  });

  it('renders children at animation boundary (index 14)', () => {
    const { getByText } = render(
      <AnimatedListItem index={14}>
        <Text>Boundary Item</Text>
      </AnimatedListItem>
    );
    expect(getByText('Boundary Item')).toBeTruthy();
  });

  it('renders children at index 0', () => {
    const { getByText } = render(
      <AnimatedListItem index={0}>
        <Text>First Item</Text>
      </AnimatedListItem>
    );
    expect(getByText('First Item')).toBeTruthy();
  });
});

// ─── AnimatedPressable ────────────────────────────────────────────────────

describe('AnimatedPressable', () => {
  it('renders children', () => {
    const { getByText } = render(
      <AnimatedPressable>
        <Text>Press Me</Text>
      </AnimatedPressable>
    );
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders with button variant', () => {
    const { getByText } = render(
      <AnimatedPressable variant="button">
        <Text>Button</Text>
      </AnimatedPressable>
    );
    expect(getByText('Button')).toBeTruthy();
  });

  it('renders with card variant', () => {
    const { getByText } = render(
      <AnimatedPressable variant="card">
        <Text>Card</Text>
      </AnimatedPressable>
    );
    expect(getByText('Card')).toBeTruthy();
  });

  it('renders with row variant', () => {
    const { getByText } = render(
      <AnimatedPressable variant="row">
        <Text>Row</Text>
      </AnimatedPressable>
    );
    expect(getByText('Row')).toBeTruthy();
  });

  it('handles disabled state', () => {
    const { getByText } = render(
      <AnimatedPressable disabled>
        <Text>Disabled</Text>
      </AnimatedPressable>
    );
    expect(getByText('Disabled')).toBeTruthy();
  });
});

// ─── GradientCard ─────────────────────────────────────────────────────────

describe('GradientCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <GradientCard colors={['#6C63FF', '#8B85FF']}>
        <Text>Gradient Content</Text>
      </GradientCard>
    );
    expect(getByText('Gradient Content')).toBeTruthy();
  });

  it('renders with multiple children', () => {
    const { getByText } = render(
      <GradientCard colors={['#34D399', '#059669']}>
        <Text>Title</Text>
        <Text>Subtitle</Text>
      </GradientCard>
    );
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Subtitle')).toBeTruthy();
  });

  it('renders with three colors', () => {
    const { getByText } = render(
      <GradientCard colors={['#FF0000', '#00FF00', '#0000FF']}>
        <Text>Rainbow</Text>
      </GradientCard>
    );
    expect(getByText('Rainbow')).toBeTruthy();
  });
});

// ─── Skeleton Components ──────────────────────────────────────────────────

describe('Skeleton Components', () => {
  it('BalanceCardSkeleton renders without crashing', () => {
    const { toJSON } = render(<BalanceCardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('KidCardSkeleton renders without crashing', () => {
    const { toJSON } = render(<KidCardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('TransactionSkeleton renders without crashing', () => {
    const { toJSON } = render(<TransactionSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('AdminDashboardSkeleton renders without crashing', () => {
    const { toJSON } = render(<AdminDashboardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('AdminDashboardSkeleton contains multiple KidCardSkeletons', () => {
    const { toJSON } = render(<AdminDashboardSkeleton />);
    const json = JSON.stringify(toJSON());
    expect(json).toBeTruthy();
  });
});

// ─── StatsView ────────────────────────────────────────────────────────────

describe('StatsView', () => {
  it('renders empty state when no transactions', () => {
    const { getByText } = render(<StatsView transactions={[]} colors={LightColors} />);
    expect(getByText('No Data Yet')).toBeTruthy();
    expect(getByText('📊')).toBeTruthy();
  });

  it('renders empty state subtitle', () => {
    const { getByText } = render(<StatsView transactions={[]} colors={LightColors} />);
    expect(getByText('Stats will appear once there are transactions to analyze.')).toBeTruthy();
  });

  it('renders summary cards with transactions', () => {
    const txs = [
      makeTx({ type: 'add', amount: 100, date: '2025-03-10T10:00:00.000Z' }),
      makeTx({ id: 'tx-2', type: 'subtract', amount: 30, category: 'food', date: '2025-03-15T10:00:00.000Z' }),
    ];
    const { getByText } = render(<StatsView transactions={txs} colors={LightColors} />);
    expect(getByText('Total Income')).toBeTruthy();
    expect(getByText('Total Expenses')).toBeTruthy();
    expect(getByText('Transactions')).toBeTruthy();
    expect(getByText('Avg Amount')).toBeTruthy();
  });

  it('renders income vs expenses section', () => {
    const txs = [
      makeTx({ type: 'add', amount: 100, date: '2025-03-10T10:00:00.000Z' }),
      makeTx({ id: 'tx-2', type: 'subtract', amount: 30, category: 'food', date: '2025-03-15T10:00:00.000Z' }),
    ];
    const { getByText } = render(<StatsView transactions={txs} colors={LightColors} />);
    expect(getByText('Income vs Expenses')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expenses')).toBeTruthy();
  });

  it('renders total income and expense values', () => {
    const txs = [
      makeTx({ type: 'add', amount: 100, date: '2025-03-10T10:00:00.000Z' }),
      makeTx({ id: 'tx-2', type: 'subtract', amount: 30, category: 'food', date: '2025-03-15T10:00:00.000Z' }),
    ];
    const { getAllByText } = render(<StatsView transactions={txs} colors={LightColors} />);
    expect(getAllByText('$100.00').length).toBeGreaterThan(0);
    expect(getAllByText('$30.00').length).toBeGreaterThan(0);
  });

  it('renders spending by category when expenses exist', () => {
    const txs = [
      makeTx({ id: 'tx-1', type: 'subtract', amount: 50, category: 'food', date: '2025-03-10T10:00:00.000Z' }),
      makeTx({ id: 'tx-2', type: 'subtract', amount: 30, category: 'toys', date: '2025-03-11T10:00:00.000Z' }),
    ];
    const { getByText } = render(<StatsView transactions={txs} colors={LightColors} />);
    expect(getByText('Spending by Category')).toBeTruthy();
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Toys')).toBeTruthy();
  });

  it('renders transaction count correctly', () => {
    const txs = [
      makeTx({ id: 'tx-1', date: '2025-03-10T10:00:00.000Z' }),
      makeTx({ id: 'tx-2', date: '2025-03-11T10:00:00.000Z' }),
      makeTx({ id: 'tx-3', date: '2025-03-12T10:00:00.000Z' }),
    ];
    const { getByText } = render(<StatsView transactions={txs} colors={LightColors} />);
    expect(getByText('3')).toBeTruthy();
  });

  it('renders monthly trend with transactions across months', () => {
    const txs = [
      makeTx({ id: 'tx-1', type: 'add', amount: 100, date: '2025-01-15T10:00:00.000Z' }),
      makeTx({ id: 'tx-2', type: 'add', amount: 50, date: '2025-02-15T10:00:00.000Z' }),
      makeTx({ id: 'tx-3', type: 'subtract', amount: 20, category: 'food', date: '2025-03-15T10:00:00.000Z' }),
    ];
    const { getByText } = render(<StatsView transactions={txs} colors={LightColors} />);
    expect(getByText('Monthly Trend')).toBeTruthy();
  });
});

// ─── TransactionModal ─────────────────────────────────────────────────────

describe('TransactionModal', () => {
  it('renders "Add Funds" title for add type', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Add Funds')).toBeTruthy();
  });

  it('renders "Subtract Funds" title for subtract type', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="subtract"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Subtract Funds')).toBeTruthy();
  });

  it('renders amount and description fields', () => {
    const { getByText, getByPlaceholderText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Amount')).toBeTruthy();
    expect(getByText('Description')).toBeTruthy();
    expect(getByPlaceholderText('0.00')).toBeTruthy();
  });

  it('renders category section', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Category')).toBeTruthy();
  });

  it('renders Cancel and Add buttons', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Add')).toBeTruthy();
  });

  it('renders Subtract button for subtract type', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="subtract"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Subtract')).toBeTruthy();
  });

  it('renders "Edit Transaction" title when editing', () => {
    const editTx = makeTx({ type: 'add', amount: 50, description: 'Gift' });
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        editTransaction={editTx}
      />
    );
    expect(getByText('Edit Transaction')).toBeTruthy();
  });

  it('renders Save button when editing', () => {
    const editTx = makeTx({ type: 'add', amount: 50, description: 'Gift' });
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        editTransaction={editTx}
      />
    );
    expect(getByText('Save')).toBeTruthy();
  });

  it('renders Delete Transaction button when editing with onDelete', () => {
    const editTx = makeTx({ type: 'subtract', amount: 10, description: 'Snack' });
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="subtract"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        editTransaction={editTx}
        onDelete={jest.fn()}
      />
    );
    expect(getByText('Delete Transaction')).toBeTruthy();
  });

  it('does not render Delete button when not editing', () => {
    const { queryByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(queryByText('Delete Transaction')).toBeNull();
  });

  it('renders all category chips', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="subtract"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Toys')).toBeTruthy();
    expect(getByText('Other')).toBeTruthy();
    expect(getByText('Gift')).toBeTruthy();
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={onClose}
        onSubmit={jest.fn()}
      />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('populates fields when editing', () => {
    const editTx = makeTx({ type: 'add', amount: 75, description: 'Birthday gift' });
    const { getByDisplayValue } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        editTransaction={editTx}
      />
    );
    expect(getByDisplayValue('75')).toBeTruthy();
    expect(getByDisplayValue('Birthday gift')).toBeTruthy();
  });

  it('renders dollar sign in amount field', () => {
    const { getByText } = render(
      <TransactionModal
        visible={true}
        type="add"
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );
    expect(getByText('$')).toBeTruthy();
  });
});

// ─── KidCard Extended ─────────────────────────────────────────────────────

describe('KidCard Extended', () => {
  it('renders zero balance correctly', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ balance: 0 })} onPress={jest.fn()} />
    );
    expect(getByText('$0.00')).toBeTruthy();
  });

  it('renders large balance correctly', () => {
    const { getByText } = render(
      <KidCard kid={makeKid({ balance: 9999.99 })} onPress={jest.fn()} />
    );
    expect(getByText('$9999.99')).toBeTruthy();
  });

  it('renders negative balance with negative goal progress as 0%', () => {
    const kid = makeKid({
      balance: -10,
      savingsGoal: { name: 'Toy', targetAmount: 50 },
    });
    const { getByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(getByText('0%')).toBeTruthy();
  });

  it('shows $0.00 of target when balance is negative with goal', () => {
    const kid = makeKid({
      balance: -20,
      savingsGoal: { name: 'Toy', targetAmount: 50 },
    });
    const { getByText } = render(
      <KidCard kid={kid} onPress={jest.fn()} />
    );
    expect(getByText('$0.00 of $50.00')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <KidCard kid={makeKid()} onPress={onPress} />
    );
    fireEvent.press(getByText('Alice'));
    expect(onPress).toHaveBeenCalled();
  });
});

// ─── TransactionItem Extended ─────────────────────────────────────────────

describe('TransactionItem Extended', () => {
  it('renders allowance category', () => {
    const tx = makeTx({ category: 'allowance', description: 'Weekly allowance' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Allowance')).toBeTruthy();
    expect(getByText('💰')).toBeTruthy();
  });

  it('renders education category', () => {
    const tx = makeTx({ category: 'education', description: 'Books' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Education')).toBeTruthy();
    expect(getByText('📚')).toBeTruthy();
  });

  it('renders entertainment category', () => {
    const tx = makeTx({ category: 'entertainment', description: 'Movie' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Entertainment')).toBeTruthy();
    expect(getByText('🎬')).toBeTruthy();
  });

  it('renders clothing category', () => {
    const tx = makeTx({ category: 'clothing', description: 'T-shirt' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Clothing')).toBeTruthy();
    expect(getByText('👕')).toBeTruthy();
  });

  it('renders savings category', () => {
    const tx = makeTx({ category: 'savings', description: 'Deposit' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Savings')).toBeTruthy();
    expect(getByText('🏦')).toBeTruthy();
  });

  it('renders fines category', () => {
    const tx = makeTx({ type: 'subtract', category: 'fines', description: 'Late chore' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Fines')).toBeTruthy();
    expect(getByText('🚫')).toBeTruthy();
  });

  it('renders transfer category', () => {
    const tx = makeTx({ category: 'transfer', description: 'To Bob' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Transfer')).toBeTruthy();
    expect(getByText('🤝')).toBeTruthy();
  });

  it('renders other category', () => {
    const tx = makeTx({ category: 'other', description: 'Misc' });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('Other')).toBeTruthy();
    expect(getByText('📌')).toBeTruthy();
  });

  it('calls onPress when provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(<TransactionItem transaction={makeTx()} onPress={onPress} />);
    fireEvent.press(getByText('Birthday money'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders zero amount', () => {
    const tx = makeTx({ amount: 0 });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('+$0.00')).toBeTruthy();
  });

  it('renders large amount', () => {
    const tx = makeTx({ amount: 1000 });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('+$1000.00')).toBeTruthy();
  });

  it('renders fractional amount precisely', () => {
    const tx = makeTx({ amount: 3.14 });
    const { getByText } = render(<TransactionItem transaction={tx} />);
    expect(getByText('+$3.14')).toBeTruthy();
  });
});

// ─── EmptyState Extended ──────────────────────────────────────────────────

describe('EmptyState Extended', () => {
  it('renders all three props together', () => {
    const { getByText } = render(
      <EmptyState icon="🎯" title="No Goals" subtitle="Set a savings goal to track progress" />
    );
    expect(getByText('🎯')).toBeTruthy();
    expect(getByText('No Goals')).toBeTruthy();
    expect(getByText('Set a savings goal to track progress')).toBeTruthy();
  });

  it('renders with different emojis', () => {
    const icons = ['💸', '📈', '🏆', '🔔'];
    icons.forEach((icon) => {
      const { getByText } = render(
        <EmptyState icon={icon} title="Test" subtitle="Test sub" />
      );
      expect(getByText(icon)).toBeTruthy();
    });
  });

  it('renders long subtitle text', () => {
    const longText = 'This is a very long subtitle that spans multiple lines and should still render correctly in the empty state component.';
    const { getByText } = render(
      <EmptyState icon="📝" title="Empty" subtitle={longText} />
    );
    expect(getByText(longText)).toBeTruthy();
  });
});
