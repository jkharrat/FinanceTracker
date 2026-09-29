import { computeKidBadges } from '../utils/kidBadges';
import { Transaction } from '../types';

const NOW = new Date('2026-09-20T12:00:00.000Z');
const DAY = 86400000;
let n = 0;
const tx = (daysAgo: number, type: 'add' | 'subtract', amount: number): Transaction => ({
  id: `t${n++}`,
  type,
  amount,
  description: 'x',
  category: type === 'add' ? 'allowance' : 'food',
  date: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
});
const ids = (txs: Transaction[]) => computeKidBadges(txs, NOW).map((b) => b.id);

describe('computeKidBadges', () => {
  it('returns nothing without history', () => {
    expect(ids([])).toEqual([]);
  });

  it('celebrates saving more than last month only when last month had activity', () => {
    expect(ids([tx(2, 'add', 10), tx(3, 'subtract', 2)])).not.toContain('saved-more');
    expect(ids([tx(2, 'add', 10), tx(30, 'add', 3)])).toContain('saved-more');
    expect(ids([tx(2, 'add', 2), tx(30, 'add', 10)])).not.toContain('saved-more');
  });

  it('awards the best week only when this week beats every earlier week', () => {
    expect(ids([tx(1, 'add', 20), tx(9, 'add', 5)])).toContain('best-week');
    expect(ids([tx(1, 'add', 5), tx(9, 'add', 20)])).not.toContain('best-week');
    expect(ids([tx(1, 'add', 5)])).not.toContain('best-week');
  });

  it('awards a no-spend week only with older history and no recent spending', () => {
    expect(ids([tx(10, 'add', 5)])).toContain('no-spend');
    expect(ids([tx(10, 'add', 5), tx(2, 'subtract', 1)])).not.toContain('no-spend');
    expect(ids([tx(2, 'add', 5)])).not.toContain('no-spend');
  });
});
