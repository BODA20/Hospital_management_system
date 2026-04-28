import {
  calcPercentageChange,
  resolveDateRange,
  formatGrowth,
  eachDay,
} from '../../src/modules/dashboard/dashboard.utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — calcPercentageChange() (The Growth Rate Math)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: calcPercentageChange(current, previous)', () => {

  // ─── ✅ Standard formula: ((M - N) / N) * 100 ─────────────────────────────
  describe('✅ Standard percentage-change formula', () => {
    it('should return 25 for (5000, 4000) — 25% revenue growth', () => {
      expect(calcPercentageChange(5000, 4000)).toBe(25);
    });

    it('should return -50 for (50, 100) — 50% decline', () => {
      expect(calcPercentageChange(50, 100)).toBe(-50);
    });

    it('should return 0 for (100, 100) — no change', () => {
      expect(calcPercentageChange(100, 100)).toBe(0);
    });

    it('should return 100 for (200, 100) — doubling', () => {
      expect(calcPercentageChange(200, 100)).toBe(100);
    });

    it('should round decimal results to 2 places', () => {
      // ((7 - 3) / 3) * 100 = 133.333... → 133.33
      expect(calcPercentageChange(7, 3)).toBe(133.33);
    });
  });

  // ─── 💥 Edge Cases: Division by Zero ──────────────────────────────────────
  describe('💥 Edge Cases — division by zero (previous = 0)', () => {
    it('should return 0 when both current and previous are 0 (no activity)', () => {
      // Critical: 0/0 must return 0, not NaN or Infinity
      const result = calcPercentageChange(0, 0);
      expect(result).toBe(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should return 100 when previous is 0 but current > 0 (new growth)', () => {
      // Critical: N/0 must return 100 (defined convention), not Infinity
      const result = calcPercentageChange(500, 0);
      expect(result).toBe(100);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should NEVER return Infinity', () => {
      // This is the core safety invariant
      expect(calcPercentageChange(999, 0)).not.toBe(Infinity);
      expect(calcPercentageChange(1, 0)).not.toBe(Infinity);
    });

    it('should NEVER return NaN', () => {
      expect(Number.isNaN(calcPercentageChange(0, 0))).toBe(false);
    });

    it('should return -100 when current is 0 but previous > 0 (total loss)', () => {
      expect(calcPercentageChange(0, 100)).toBe(-100);
    });
  });

  // ─── 🔢 Type Safety ───────────────────────────────────────────────────────
  describe('🔢 Type Safety — always returns a finite number', () => {
    it('should always return a finite number for any valid input', () => {
      const cases: [number, number][] = [
        [0, 0], [1, 0], [0, 1], [100, 200], [999, 1], [1, 999],
      ];
      for (const [cur, prev] of cases) {
        const result = calcPercentageChange(cur, prev);
        expect(Number.isFinite(result)).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — formatGrowth()
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: formatGrowth(pct)', () => {
  it('should prepend "+" for positive values', () => {
    expect(formatGrowth(25)).toBe('+25%');
  });

  it('should NOT prepend "+" for negative values (they already have minus)', () => {
    expect(formatGrowth(-10)).toBe('-10%');
  });

  it('should NOT prepend "+" for zero', () => {
    expect(formatGrowth(0)).toBe('0%');
  });

  it('should preserve decimal precision from calcPercentageChange output', () => {
    expect(formatGrowth(133.33)).toBe('+133.33%');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — resolveDateRange() (Time-Insensitive / Fixed-Date)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: resolveDateRange(params)', () => {

  // ─── Custom Range ──────────────────────────────────────────────────────────
  describe('Custom date range (startDate + endDate)', () => {
    it('should set current.start and current.end to the supplied dates', () => {
      // Arrange — fixed dates prevent test flakiness
      const range = resolveDateRange({
        startDate: '2025-01-01',
        endDate:   '2025-01-31',
      });

      // Assert
      expect(range.current.start).toBe('2025-01-01');
      expect(range.current.end).toBe('2025-01-31');
    });

    it('should set previous.end to the day BEFORE startDate', () => {
      const range = resolveDateRange({
        startDate: '2025-01-01',
        endDate:   '2025-01-31',
      });

      // Assert — previous window ends on 2024-12-31
      expect(range.previous.end).toBe('2024-12-31');
    });

    it('should make the previous window the same length as the current window', () => {
      // 31-day window → previous should also be 31 days
      const range = resolveDateRange({
        startDate: '2025-01-01',
        endDate:   '2025-01-31',
      });

      const currentMs =
        new Date(range.current.end).getTime() - new Date(range.current.start).getTime();
      const previousMs =
        new Date(range.previous.end).getTime() - new Date(range.previous.start).getTime();

      expect(currentMs).toBe(previousMs);
    });

    it('should format the label as "startDate – endDate"', () => {
      const range = resolveDateRange({
        startDate: '2025-06-01',
        endDate:   '2025-06-15',
      });
      expect(range.label).toBe('2025-06-01 – 2025-06-15');
    });
  });

  // ─── Period: today ─────────────────────────────────────────────────────────
  describe('period = "today"', () => {
    it('should set label to "Today"', () => {
      const range = resolveDateRange({ period: 'today' });
      expect(range.label).toBe('Today');
    });

    it('should have current.start === current.end (single-day window)', () => {
      const range = resolveDateRange({ period: 'today' });
      expect(range.current.start).toBe(range.current.end);
    });

    it('should have previous.start === previous.end (single-day yesterday)', () => {
      const range = resolveDateRange({ period: 'today' });
      expect(range.previous.start).toBe(range.previous.end);
    });

    it('should have previous.end exactly 1 day before current.start', () => {
      const range = resolveDateRange({ period: 'today' });
      const currentStart  = new Date(range.current.start).getTime();
      const previousEnd   = new Date(range.previous.end).getTime();
      const diff = (currentStart - previousEnd) / 86_400_000;
      expect(diff).toBe(1);
    });
  });

  // ─── Period: week ──────────────────────────────────────────────────────────
  describe('period = "week"', () => {
    it('should set label to "This Week"', () => {
      const range = resolveDateRange({ period: 'week' });
      expect(range.label).toBe('This Week');
    });

    it('should have current.start on a Monday (ISO week)', () => {
      const range = resolveDateRange({ period: 'week' });
      // Day 1 = Monday in JS getDay() where 0=Sunday
      const dow = new Date(range.current.start).getDay();
      expect(dow).toBe(1);
    });

    it('should have previous.end exactly 1 day before current.start', () => {
      const range = resolveDateRange({ period: 'week' });
      const currentStart = new Date(range.current.start).getTime();
      const previousEnd  = new Date(range.previous.end).getTime();
      const diff = (currentStart - previousEnd) / 86_400_000;
      expect(diff).toBe(1);
    });
  });

  // ─── Period: month ─────────────────────────────────────────────────────────
  describe('period = "month"', () => {
    it('should set label to "This Month"', () => {
      const range = resolveDateRange({ period: 'month' });
      expect(range.label).toBe('This Month');
    });

    it('should have current.start on the first day of the current month', () => {
      const range = resolveDateRange({ period: 'month' });
      expect(range.current.start).toMatch(/-01$/); // ends with -01
    });
  });

  // ─── Period: year ──────────────────────────────────────────────────────────
  describe('period = "year"', () => {
    it('should set label to "This Year"', () => {
      const range = resolveDateRange({ period: 'year' });
      expect(range.label).toBe('This Year');
    });

    it('should have current.start on January 1st of the current year', () => {
      const range = resolveDateRange({ period: 'year' });
      const thisYear = new Date().getFullYear();
      expect(range.current.start).toBe(`${thisYear}-01-01`);
    });

    it('should have previous.start on January 1st of the previous year', () => {
      const range = resolveDateRange({ period: 'year' });
      const prevYear = new Date().getFullYear() - 1;
      expect(range.previous.start).toBe(`${prevYear}-01-01`);
    });

    it('should have previous.end on December 31st of the previous year', () => {
      const range = resolveDateRange({ period: 'year' });
      const prevYear = new Date().getFullYear() - 1;
      expect(range.previous.end).toBe(`${prevYear}-12-31`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — eachDay()
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: eachDay(start, end)', () => {
  it('should return a single-element array when start === end', () => {
    expect(eachDay('2025-06-15', '2025-06-15')).toEqual(['2025-06-15']);
  });

  it('should return 3 days for a 3-day window', () => {
    const days = eachDay('2025-06-01', '2025-06-03');
    expect(days).toEqual(['2025-06-01', '2025-06-02', '2025-06-03']);
    expect(days).toHaveLength(3);
  });

  it('should return exactly 31 days for a full month (January)', () => {
    const days = eachDay('2025-01-01', '2025-01-31');
    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2025-01-01');
    expect(days[30]).toBe('2025-01-31');
  });

  it('should correctly handle leap-year February (29 days in 2024)', () => {
    const days = eachDay('2024-02-01', '2024-02-29');
    expect(days).toHaveLength(29);
    expect(days[28]).toBe('2024-02-29');
  });

  it('should return dates in ascending chronological order', () => {
    const days = eachDay('2025-03-28', '2025-04-02');
    expect(days).toEqual([
      '2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31',
      '2025-04-01', '2025-04-02',
    ]);
  });

  it('should format each entry as YYYY-MM-DD', () => {
    const days = eachDay('2025-12-30', '2025-12-31');
    for (const d of days) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
