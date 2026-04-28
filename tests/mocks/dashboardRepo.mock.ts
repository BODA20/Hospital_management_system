import * as dashboardRepo from '../../src/modules/dashboard/repositories/dashboard.repository';

jest.mock('../../src/modules/dashboard/repositories/dashboard.repository', () => ({
  getGlobalStats:          jest.fn(),
  getComparativeMetrics:   jest.fn(),
  getTopDoctors:           jest.fn(),
  getDailyBreakdown:       jest.fn(),
}));

export const mockedDashboardRepo = dashboardRepo as jest.Mocked<typeof dashboardRepo>;

export const makeGlobalStats = (overrides: Partial<Record<string, any>> = {}) => ({
  total_patients:      42,
  total_doctors:       8,
  today_appointments:  10,
  today_attended:      7,
  dept_activity: [
    { department: 'Cardiology', code: 'CARD', appointment_count: 4 },
    { department: 'Neurology',  code: 'NEUR', appointment_count: 3 },
  ],
  ...overrides,
});

export const makeStatsRepoDefaults = () => ({
  current: {
    revenue: 5000,
    patients: 20,
    appointments: 15,
  },
  previous: {
    revenue: 4000,
    patients: 10,
    appointments: 12,
  },
  topDoctors: [
    { id: 1, name: 'Dr. Smith', visitCount: 8 },
    { id: 2, name: 'Dr. Jones', visitCount: 5 },
  ],
  chartData: [
    { date: '2025-06-01', revenue: 500, patients: 2, appointments: 3 },
    { date: '2025-06-02', revenue: 750, patients: 3, appointments: 4 },
  ],
});

export const setupStatsRepoMocks = (overrides: Partial<ReturnType<typeof makeStatsRepoDefaults>> = {}) => {
  const defaults = makeStatsRepoDefaults();
  const data = { ...defaults, ...overrides };

  mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
    current: data.current,
    previous: data.previous,
  });
  mockedDashboardRepo.getTopDoctors.mockResolvedValue(data.topDoctors as any);
  mockedDashboardRepo.getDailyBreakdown.mockResolvedValue(data.chartData as any);
};
