import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Kid, Transaction } from '../types';
import { findArrivals, markerFor, describeSource, lastSeenKey } from '../utils/moneyArrived';
import { useMoneyArrived } from '../hooks/useMoneyArrived';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx',
    type: 'add',
    amount: 5,
    description: 'Weekly allowance',
    category: 'allowance',
    date: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function kid(transactions: Transaction[], balance: number): Kid {
  return {
    id: 'kid-1',
    family_id: 'fam',
    name: 'Maya',
    avatar: '🐱',
    password: '',
    allowanceAmount: 5,
    allowanceFrequency: 'weekly',
    balance,
    transactions,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastAllowanceDate: null,
  };
}

const old = tx({ id: 'old', date: '2026-09-01T10:00:00.000Z' });
const allowance = tx({ id: 'a1', date: '2026-09-08T10:00:00.000Z' });
const gift = tx({ id: 'g1', category: 'gift', description: 'Birthday money from Grandma', amount: 20, date: '2026-09-09T10:00:00.000Z' });
const fromLeo = tx({
  id: 't1', category: 'transfer', description: 'For pizza', amount: 3, date: '2026-09-10T10:00:00.000Z',
  transfer: { transferId: 'x', fromKidId: 'kid-2', toKidId: 'kid-1', fromKidName: 'Leo', toKidName: 'Maya' },
});
const sent = tx({
  id: 's1', type: 'subtract', category: 'transfer', amount: 4, date: '2026-09-11T10:00:00.000Z',
  transfer: { transferId: 'y', fromKidId: 'kid-1', toKidId: 'kid-2', fromKidName: 'Maya', toKidName: 'Leo' },
});

describe('findArrivals', () => {
  it('sums incoming money since the marker, grouped by source', () => {
    const seen = markerFor(kid([old], 10));
    const now = kid([sent, fromLeo, gift, allowance, old], 34);
    const result = findArrivals(now, seen)!;
    expect(result.total).toBe(28);
    expect(result.sources.map((s) => s.label)).toEqual(['Grandma', 'Allowance', 'Leo']);
    expect(result.previousBalance).toBe(6);
  });

  it('ignores money the kid sent', () => {
    const seen = markerFor(kid([old], 10));
    expect(findArrivals(kid([sent, old], 6), seen)).toBeNull();
  });

  it('returns nothing when the marker is current', () => {
    const now = kid([allowance, old], 15);
    expect(findArrivals(now, markerFor(now))).toBeNull();
  });

  it('falls back to the date when the seen transaction was deleted', () => {
    const seen = { txId: 'gone', date: allowance.date, balance: 10 };
    const result = findArrivals(kid([gift, allowance, old], 30), seen)!;
    expect(result.total).toBe(20);
  });
});

describe('describeSource', () => {
  it('names siblings, allowance and "from X" descriptions', () => {
    expect(describeSource(fromLeo).subtitle).toBe('from Leo');
    expect(describeSource(allowance).subtitle).toBe('from Allowance');
    expect(describeSource(gift).subtitle).toBe('from Grandma');
    expect(describeSource(tx({ category: 'gift', description: 'Chores' })).subtitle).toBe('Chores');
  });
});

describe('useMoneyArrived', () => {
  const getItem = AsyncStorage.getItem as jest.Mock;
  const setItem = AsyncStorage.setItem as jest.Mock;

  afterEach(() => {
    getItem.mockReset();
    getItem.mockImplementation(() => Promise.resolve(null));
    setItem.mockClear();
  });

  it('only records a marker on the first-ever load', async () => {
    const { result } = renderHook(() => useMoneyArrived(kid([allowance, old], 15), true));
    await waitFor(() => expect(setItem).toHaveBeenCalled());
    expect(setItem.mock.calls[0][0]).toBe(lastSeenKey('kid-1'));
    expect(result.current.arrival).toBeNull();
  });

  it('reports money that arrived since the stored marker, and clears on dismiss', async () => {
    getItem.mockImplementation(() => Promise.resolve(JSON.stringify(markerFor(kid([old], 10)))));
    const { result } = renderHook(() => useMoneyArrived(kid([allowance, old], 15), true));
    await waitFor(() => expect(result.current.arrival).not.toBeNull());
    expect(result.current.arrival!.total).toBe(5);
    act(() => result.current.dismiss());
    expect(result.current.arrival).toBeNull();
  });

  it('waits until the dashboard is visible', async () => {
    getItem.mockImplementation(() => Promise.resolve(JSON.stringify(markerFor(kid([old], 10)))));
    const current = kid([allowance, old], 15);
    const { result, rerender } = renderHook(({ visible }: { visible: boolean }) => useMoneyArrived(current, visible), {
      initialProps: { visible: false },
    });
    await act(async () => {});
    expect(result.current.arrival).toBeNull();
    rerender({ visible: true });
    await waitFor(() => expect(result.current.arrival).not.toBeNull());
  });
});
