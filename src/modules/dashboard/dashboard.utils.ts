import type { StatsQuery } from './dashboard.validation';

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface DateWindow {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD (inclusive)
}

export interface ResolvedRange {
  label: string;
  current: DateWindow;
  previous: DateWindow;
}

// ─── Date helpers (pure, no deps) ───────────────────────────────────────────────

/** YYYY-MM-DD using local date components (avoids UTC offset shifting the date) */
const fmt = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Clone a Date so mutations don't leak */
const clone = (d: Date): Date => new Date(d.getTime());

/** Monday of the ISO week containing `d` */
const mondayOfWeek = (d: Date): Date => {
  const c = clone(d);
  const day = c.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  return c;
};

/** Last day of a month (year, month are 0-indexed for month) */
const lastDayOfMonth = (year: number, month: number): Date =>
  new Date(year, month + 1, 0);

// ─── resolveDateRange ───────────────────────────────────────────────────────────

/**
 * Converts the validated query params into two concrete date windows:
 *   • current  – the period the admin selected
 *   • previous – an identical-length period immediately before
 */
export const resolveDateRange = (params: StatsQuery): ResolvedRange => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Custom range takes precedence
  if (params.startDate && params.endDate) {
    const cs = new Date(params.startDate);
    const ce = new Date(params.endDate);
    const durationMs = ce.getTime() - cs.getTime();
    const pe = new Date(cs.getTime() - 86_400_000); // day before current start
    const ps = new Date(pe.getTime() - durationMs);

    return {
      label: `${params.startDate} – ${params.endDate}`,
      current: { start: fmt(cs), end: fmt(ce) },
      previous: { start: fmt(ps), end: fmt(pe) },
    };
  }

  switch (params.period) {
    case 'today': {
      const yesterday = clone(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        label: 'Today',
        current: { start: fmt(today), end: fmt(today) },
        previous: { start: fmt(yesterday), end: fmt(yesterday) },
      };
    }

    case 'week': {
      const currentMonday = mondayOfWeek(today);
      const prevMonday = clone(currentMonday);
      prevMonday.setDate(prevMonday.getDate() - 7);
      const prevSunday = clone(currentMonday);
      prevSunday.setDate(prevSunday.getDate() - 1);
      return {
        label: 'This Week',
        current: { start: fmt(currentMonday), end: fmt(today) },
        previous: { start: fmt(prevMonday), end: fmt(prevSunday) },
      };
    }

    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd = lastDayOfMonth(today.getFullYear(), today.getMonth() - 1);
      return {
        label: 'This Month',
        current: { start: fmt(monthStart), end: fmt(today) },
        previous: { start: fmt(prevMonthStart), end: fmt(prevMonthEnd) },
      };
    }

    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const prevYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const prevYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      return {
        label: 'This Year',
        current: { start: fmt(yearStart), end: fmt(today) },
        previous: { start: fmt(prevYearStart), end: fmt(prevYearEnd) },
      };
    }

    default: {
      // Fallback (should never happen after Zod validation)
      return {
        label: 'Today',
        current: { start: fmt(today), end: fmt(today) },
        previous: {
          start: fmt(new Date(today.getTime() - 86_400_000)),
          end: fmt(new Date(today.getTime() - 86_400_000)),
        },
      };
    }
  }
};

// ─── Percentage Change ──────────────────────────────────────────────────────────

/**
 * Safe percentage-change calculation.
 *
 * | previous | current | result        |
 * |----------|---------|---------------|
 * | 0        | 0       |   0           |
 * | 0        | N > 0   | 100           |
 * | N > 0    | 0       | -100          |
 * | N        | M       | ((M-N)/N)*100 |
 */
export const calcPercentageChange = (
  current: number,
  previous: number,
): number => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

/** Format a numeric change into a display string like "+25%" or "-10%". */
export const formatGrowth = (pct: number): string => {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}%`;
};

// ─── Daily series ───────────────────────────────────────────────────────────────

/** Returns an array of YYYY-MM-DD strings from `start` to `end` (inclusive). */
export const eachDay = (start: string, end: string): string[] => {
  const days: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    days.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};
