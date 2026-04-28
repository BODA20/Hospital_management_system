import db from '../../../config/db';

// ?????? Global Hospital Stats (existing – unchanged) ????????????????????????????????????????????????????????????????
export const getGlobalStats = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [[{ count: total_patients }], [{ count: total_doctors }]] =
    await Promise.all([
      db('patients').count('id as count'),
      db('doctors').count('id as count'),
    ]);

  const [{ count: today_appointments }] = await db('appointments')
    .count('id as count')
    .where('starts_at', '>=', todayStart)
    .where('starts_at', '<', todayEnd);

  const [{ count: today_attended }] = await db('visits')
    .count('id as count')
    .where('check_in_at', '>=', todayStart)
    .where('check_in_at', '<', todayEnd)
    .andWhere('status', 'completed');

  const dept_activity = await db('appointments as a')
    .join('doctors as d', 'a.doctor_id', 'd.id')
    .join('departments as dept', 'd.department_id', 'dept.id')
    .select('dept.name as department', 'dept.code as code')
    .count('a.id as appointment_count')
    .where('a.starts_at', '>=', todayStart)
    .where('a.starts_at', '<', todayEnd)
    .groupBy('dept.id', 'dept.name', 'dept.code')
    .orderBy('appointment_count', 'desc');

  return {
    total_patients: Number(total_patients),
    total_doctors: Number(total_doctors),
    today_appointments: Number(today_appointments),
    today_attended: Number(today_attended),
    dept_activity,
  };
};

/**
 * Consolidated Comparative Metrics for Dashboard
 * Fetches revenue, patients, and appointments for BOTH current and previous periods in 1 query.
 */
export const getComparativeMetrics = async (
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string,
) => {
  const nextDayCurrent = nextDay(currentEnd);
  const nextDayPrevious = nextDay(previousEnd);

  const sql = `
    WITH metrics AS (
      -- Current Period
      SELECT 
        'current' as period,
        (SELECT COALESCE(SUM(final_amount), 0) FROM invoices WHERE status = 'paid' AND created_at >= ? AND created_at < ?) as revenue,
        (SELECT COUNT(*) FROM patients WHERE created_at >= ? AND created_at < ?) as patients,
        (SELECT COUNT(*) FROM appointments WHERE status IN ('scheduled','completed') AND starts_at >= ? AND starts_at < ?) as appointments
      UNION ALL
      -- Previous Period
      SELECT 
        'previous' as period,
        (SELECT COALESCE(SUM(final_amount), 0) FROM invoices WHERE status = 'paid' AND created_at >= ? AND created_at < ?) as revenue,
        (SELECT COUNT(*) FROM patients WHERE created_at >= ? AND created_at < ?) as patients,
        (SELECT COUNT(*) FROM appointments WHERE status IN ('scheduled','completed') AND starts_at >= ? AND starts_at < ?) as appointments
    )
    SELECT * FROM metrics;
  `;

  const { rows } = await db.raw(sql, [
    currentStart + 'T00:00:00', nextDayCurrent,
    currentStart + 'T00:00:00', nextDayCurrent,
    currentStart + 'T00:00:00', nextDayCurrent,
    previousStart + 'T00:00:00', nextDayPrevious,
    previousStart + 'T00:00:00', nextDayPrevious,
    previousStart + 'T00:00:00', nextDayPrevious,
  ]);

  const current = rows.find((r: any) => r.period === 'current');
  const previous = rows.find((r: any) => r.period === 'previous');

  return {
    current: {
      revenue: Number(current.revenue),
      patients: Number(current.patients),
      appointments: Number(current.appointments),
    },
    previous: {
      revenue: Number(previous.revenue),
      patients: Number(previous.patients),
      appointments: Number(previous.appointments),
    },
  };
};

/**
 * Top doctors by completed visit count within the date range.
 */
export const getTopDoctors = async (
  start: string,
  end: string,
  limit = 5,
): Promise<{ id: number; name: string; visitCount: number }[]> => {
  const rows = await db('visits as v')
    .join('doctors as d', 'v.doctor_id', 'd.id')
    .join('users as u', 'd.user_id', 'u.id')
    .select('d.id', 'u.full_name as name')
    .count('v.id as visit_count')
    .where('v.status', 'completed')
    .andWhere('v.check_in_at', '>=', start + 'T00:00:00')
    .andWhere('v.check_in_at', '<', nextDay(end))
    .groupBy('d.id', 'u.full_name')
    .orderBy('visit_count', 'desc')
    .limit(limit);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    visitCount: Number(r.visit_count),
  }));
};

/**
 * Daily breakdown for chartData.
 */
export const getDailyBreakdown = async (
  start: string,
  end: string,
): Promise<
  { date: string; revenue: number; patients: number; appointments: number }[]
> => {
  const nextDayVal = nextDay(end);
  const rows = await db.raw(
    `
    SELECT
      d::date AS date,
      COALESCE(rev.revenue, 0)         AS revenue,
      COALESCE(pat.patients, 0)        AS patients,
      COALESCE(appt.appointments, 0)   AS appointments
    FROM generate_series(?::date, ?::date, '1 day'::interval) AS d
    LEFT JOIN (
      SELECT created_at::date AS day, SUM(final_amount) AS revenue
      FROM invoices
      WHERE status = 'paid'
        AND created_at >= ?::timestamp
        AND created_at <  ?::timestamp
      GROUP BY day
    ) rev ON rev.day = d::date
    LEFT JOIN (
      SELECT created_at::date AS day, COUNT(*) AS patients
      FROM patients
      WHERE created_at >= ?::timestamp
        AND created_at <  ?::timestamp
      GROUP BY day
    ) pat ON pat.day = d::date
    LEFT JOIN (
      SELECT starts_at::date AS day, COUNT(*) AS appointments
      FROM appointments
      WHERE status IN ('scheduled','completed')
        AND starts_at >= ?::timestamp
        AND starts_at <  ?::timestamp
      GROUP BY day
    ) appt ON appt.day = d::date
    ORDER BY date
    `,
    [
      start, end,
      start + 'T00:00:00', nextDayVal,
      start + 'T00:00:00', nextDayVal,
      start + 'T00:00:00', nextDayVal,
    ],
  );

  return rows.rows.map((r: any) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
    revenue: Number(r.revenue),
    patients: Number(r.patients),
    appointments: Number(r.appointments),
  }));
};

// ?? helpers ??
function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0] + 'T00:00:00';
}
