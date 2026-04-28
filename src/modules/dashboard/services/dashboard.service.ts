import * as dashboardRepo from '../repositories/dashboard.repository';
import {
  resolveDateRange,
  calcPercentageChange,
  formatGrowth,
} from '../dashboard.utils';
import type { StatsQuery } from '../dashboard.validation';

// ?????? Existing admin summary ????????????????????????????????????????????????????????????????????????????????????????????????????????????????
export const getAdminSummary = async () => {
  const stats = await dashboardRepo.getGlobalStats();

  const {
    total_patients,
    total_doctors,
    today_appointments,
    today_attended,
    dept_activity,
  } = stats;

  const today_missed = Math.max(0, today_appointments - today_attended);

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
      attendance_label: "% of today's appointments attended",
      dept_activity: dept_activity.map((d: any) => ({
        department: d.department,
        code: d.code,
        appointment_count: Number(d.appointment_count),
      })),
    },
  };
};

// ?????? Comparative stats ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

export const getStats = async (query: StatsQuery) => {
  const range = resolveDateRange(query);
  const { current, previous } = range;

  // 1. Fetch consolidated metrics and breakdown/top doctors in parallel
  // Reduced from 8 parallel calls to 3.
  const [
    metrics,
    topDoctors,
    chartData,
  ] = await Promise.all([
    dashboardRepo.getComparativeMetrics(current.start, current.end, previous.start, previous.end),
    dashboardRepo.getTopDoctors(current.start, current.end),
    dashboardRepo.getDailyBreakdown(current.start, current.end),
  ]);

  const { current: c, previous: p } = metrics;

  // 2. Compute percentage changes
  const revenueChange = calcPercentageChange(c.revenue, p.revenue);
  const patientsChange = calcPercentageChange(c.patients, p.patients);
  const appointmentsChange = calcPercentageChange(c.appointments, p.appointments);

  return {
    period: {
      label: range.label,
      current: range.current,
      previous: range.previous,
    },
    summary: {
      revenue: {
        current: c.revenue,
        previous: p.revenue,
        change: revenueChange,
        growth: formatGrowth(revenueChange),
      },
      patients: {
        current: c.patients,
        previous: p.patients,
        change: patientsChange,
        growth: formatGrowth(patientsChange),
      },
      appointments: {
        current: c.appointments,
        previous: p.appointments,
        change: appointmentsChange,
        growth: formatGrowth(appointmentsChange),
      },
    },
    topDoctors,
    chartData,
  };
};
