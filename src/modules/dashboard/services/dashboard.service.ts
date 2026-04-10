import * as dashboardRepo from '../repositories/dashboard.repository';

export const getAdminSummary = async () => {
  const stats = await dashboardRepo.getGlobalStats();

  const {
    total_patients,
    total_doctors,
    today_appointments,
    today_attended,
    dept_activity,
  } = stats;

  // Derived counts
  const today_missed = Math.max(0, today_appointments - today_attended);

  // Attendance percentage (guard against division by zero)
  const attendance_percentage =
    today_appointments > 0
      ? Math.round((today_attended / today_appointments) * 100)
      : 0;

  return {
    counts: {
      total_patients,
      total_doctors,
      today_appointments,
      today_attended,
      today_missed,
    },
    analytics: {
      attendance_percentage,
      attendance_label: `${attendance_percentage}% of today's appointments attended`,
      dept_activity: dept_activity.map((d: any) => ({
        department: d.department,
        code: d.code,
        appointment_count: Number(d.appointment_count),
      })),
    },
  };
};
