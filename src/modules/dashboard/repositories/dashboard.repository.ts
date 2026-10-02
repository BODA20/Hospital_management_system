import db from '../../../config/db';

// ── Global Hospital Stats ──────────────────────────────────────────────────────
// All "today" comparisons use Africa/Cairo local date to match application
// timezone, consistent with the fix already applied to the appointments module.
export const getGlobalStats = async () => {
  const [
    [{ count: total_patients }],
    [{ count: total_doctors }],
    [{ count: total_nurses }],
    [{ count: today_appointments }],
    [{ count: today_attended }],
    [{ sum: revenue_this_month }],
    [{ count: pending_applications }],
    dept_activity,
  ] = await Promise.all([
    // Total patients
    db('patients').count('id as count'),

    // Active doctors (any doctor profile = active)
    db('doctors').count('id as count'),

    // Nurse staff rows
    db('nurses').count('id as count'),

    // Appointments TODAY — Cairo local date (mirrors appo.repo.ts fix)
    db('appointments')
      .count('id as count')
      .whereRaw(
        "appointment_date = (NOW() AT TIME ZONE 'Africa/Cairo')::date" +
        " OR DATE(starts_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date"
      )
      .whereNotIn('status', ['cancelled', 'no_show']),

    // Visits checked in today (Cairo date) with completed status
    db('visits')
      .count('id as count')
      .whereRaw("DATE(check_in_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date")
      .where('status', 'completed'),

    // Revenue this calendar month (Cairo month boundary)
    db('invoices')
      .sum('final_amount as sum')
      .where('status', 'paid')
      .whereRaw(
        "DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') = DATE_TRUNC('month', NOW() AT TIME ZONE 'Africa/Cairo')"
      ),

    // Pending staff applications
    db('staff_applications').count('id as count').where('status', 'pending'),

    // Department activity today
    db('appointments as a')
      .join('doctors as d', 'a.doctor_id', 'd.id')
      .join('departments as dept', 'd.department_id', 'dept.id')
      .select('dept.name_en as department', 'dept.code as code')
      .count('a.id as appointment_count')
      .whereRaw(
        "a.appointment_date = (NOW() AT TIME ZONE 'Africa/Cairo')::date" +
        " OR DATE(a.starts_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date"
      )
      .whereNotIn('a.status', ['cancelled', 'no_show'])
      .groupBy('dept.id', 'dept.name_en', 'dept.code')
      .orderBy('appointment_count', 'desc'),
  ]);

  const today_attended_n = Number(today_attended);
  const today_appointments_n = Number(today_appointments);
  const today_missed = Math.max(0, today_appointments_n - today_attended_n);
  const attendance_percentage =
    today_appointments_n > 0
      ? Math.round((today_attended_n / today_appointments_n) * 100)
      : 0;

  return {
    // Flat fields for the KPI cards (matches AdminSummaryStats interface)
    total_patients: Number(total_patients),
    total_doctors: Number(total_doctors),
    total_nurses: Number(total_nurses),
    appointments_today: today_appointments_n,
    revenue_this_month: Number(revenue_this_month ?? 0),
    pending_applications: Number(pending_applications),

    // Extended analytics (kept for backward-compat with other consumers)
    today_attended: today_attended_n,
    today_missed,
    analytics: {
      attendance_percentage,
      attendance_label: "% of today's appointments attended",
      dept_activity: dept_activity.map((d: any) => ({
        department: d.department,
        code: d.code,
        appointment_count: Number(d.appointment_count),
      })),
    },
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
