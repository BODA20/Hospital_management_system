import * as dashboardRepo from '../repositories/dashboard.repository';
import {
  resolveDateRange,
  calcPercentageChange,
  formatGrowth,
} from '../dashboard.utils';
import type { StatsQuery } from '../dashboard.validation';

// ─── Existing admin summary (unchanged) ─────────────────────────────────────────
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

// ─── New comparative stats ──────────────────────────────────────────────────────

export const getStats = async (query: StatsQuery) => {
  const range = resolveDateRange(query);

  const { current, previous } = range;

  // Fetch all metrics for both periods in parallel
  const [
    currentRevenue,
    previousRevenue,
    currentPatients,
    previousPatients,
    currentAppointments,
    previousAppointments,
    topDoctors,
    chartData,
  ] = await Promise.all([
    dashboardRepo.getRevenueForRange(current.start, current.end),
    dashboardRepo.getRevenueForRange(previous.start, previous.end),
    dashboardRepo.getPatientCountForRange(current.start, current.end),
    dashboardRepo.getPatientCountForRange(previous.start, previous.end),
    dashboardRepo.getAppointmentCountForRange(current.start, current.end),
    dashboardRepo.getAppointmentCountForRange(previous.start, previous.end),
    dashboardRepo.getTopDoctors(current.start, current.end),
    dashboardRepo.getDailyBreakdown(current.start, current.end),
  ]);

  // Compute percentage changes
  const revenueChange = calcPercentageChange(currentRevenue, previousRevenue);
  const patientsChange = calcPercentageChange(currentPatients, previousPatients);
  const appointmentsChange = calcPercentageChange(
    currentAppointments,
    previousAppointments,
  );

  return {
    period: {
      label: range.label,
      current: range.current,
      previous: range.previous,
    },
    summary: {
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange,
        growth: formatGrowth(revenueChange),
      },
      patients: {
        current: currentPatients,
        previous: previousPatients,
        change: patientsChange,
        growth: formatGrowth(patientsChange),
      },
      appointments: {
        current: currentAppointments,
        previous: previousAppointments,
        change: appointmentsChange,
        growth: formatGrowth(appointmentsChange),
      },
    },
    topDoctors,
    chartData,
  };
};
