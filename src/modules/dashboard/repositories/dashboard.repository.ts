import db from '../../../config/db';

// ─── Global Hospital Stats (existing — unchanged) ──────────────────────────────
export const getGlobalStats = async () => {
  // Total patients and doctors (parallel)
  const [[{ count: total_patients }], [{ count: total_doctors }]] =
    await Promise.all([
      db('patients').count('id as count'),
      db('doctors').count('id as count'),
    ]);

  // Today's appointments (uses the `starts_at` column per schema)
  const [{ count: today_appointments }] = await db('appointments')
    .count('id as count')
    .whereRaw(`starts_at::date = CURRENT_DATE`);

  // Today's completed visits
  const [{ count: today_attended }] = await db('visits')
    .count('id as count')
    .whereRaw(`check_in_at::date = CURRENT_DATE`)
    .andWhere('status', 'completed');

  // Department activity: count of appointments per department for today
  const dept_activity = await db('appointments as a')
    .join('doctors as d', 'a.doctor_id', 'd.id')
    .join('departments as dept', 'd.department_id', 'dept.id')
    .select('dept.name as department', 'dept.code as code')
    .count('a.id as appointment_count')
    .whereRaw(`a.starts_at::date = CURRENT_DATE`)
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

// ─── Range-based queries for comparative dashboard ──────────────────────────────
// All ranges use half-open interval [start, end) via >= start AND < end+1day

/**
 * Total paid invoice revenue within the date range.
 */
export const getRevenueForRange = async (
  start: string,
  end: string,
): Promise<number> => {
  const [{ revenue }] = await db('invoices')
    .select(db.raw('COALESCE(SUM(final_amount), 0) AS revenue'))
    .where('status', 'paid')
    .andWhere('created_at', '>=', `${start}T00:00:00`)
    .andWhere('created_at', '<', nextDay(end));

  return Number(revenue);
};

/**
 * Number of patients registered within the date range.
 */
export const getPatientCountForRange = async (
  start: string,
  end: string,
): Promise<number> => {
  const [{ count }] = await db('patients')
    .count('id as count')
    .where('created_at', '>=', `${start}T00:00:00`)
    .andWhere('created_at', '<', nextDay(end));

  return Number(count);
};

/**
 * Number of appointments (scheduled or completed) within the date range.
 */
export const getAppointmentCountForRange = async (
  start: string,
  end: string,
): Promise<number> => {
  const [{ count }] = await db('appointments')
    .count('id as count')
    .whereIn('status', ['scheduled', 'completed'])
    .andWhere('starts_at', '>=', `${start}T00:00:00`)
    .andWhere('starts_at', '<', nextDay(end));

  return Number(count);
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
    .andWhere('v.check_in_at', '>=', `${start}T00:00:00`)
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
 * Daily breakdown of revenue, patients, and appointments for chartData.
 * Uses PostgreSQL generate_series for gap-free date coverage.
 */
export const getDailyBreakdown = async (
  start: string,
  end: string,
): Promise<
  { date: string; revenue: number; patients: number; appointments: number }[]
> => {
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
      `${start}T00:00:00`, nextDay(end),
      `${start}T00:00:00`, nextDay(end),
      `${start}T00:00:00`, nextDay(end),
    ],
  );

  return rows.rows.map((r: any) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
    revenue: Number(r.revenue),
    patients: Number(r.patients),
    appointments: Number(r.appointments),
  }));
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Return the day AFTER `dateStr` as a timestamp string for half-open ranges. */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return `${d.toISOString().slice(0, 10)}T00:00:00`;
}
