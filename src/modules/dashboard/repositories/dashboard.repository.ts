import db from '../../../config/db';

// ─── Global Hospital Stats ─────────────────────────────────────────────────────
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
