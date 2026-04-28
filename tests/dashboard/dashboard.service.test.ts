import { mockedDashboardRepo, makeGlobalStats } from '../mocks/dashboardRepo.mock';
import * as dashboardService from '../../src/modules/dashboard/services/dashboard.service';

describe('Service: dashboardService', () => {
  describe('getStats()', () => {
    it('[Business Logic] Computes correct growth formula result for revenue', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 150, patients: 0, appointments: 0 },
        previous: { revenue: 100, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      const result = await dashboardService.getStats({ period: 'today' });

      expect(result.summary.revenue.change).toBe(50);
      expect(result.summary.revenue.growth).toBe('+50%');
    });

    it('[Edge] Does not crash when ALL previous values are 0 (full zero-guard)', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 200, patients: 10, appointments: 5 },
        previous: { revenue: 0, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      const result = await dashboardService.getStats({ period: 'today' });
      expect(result.summary.revenue.change).toBe(100);
      expect(result.summary.patients.change).toBe(100);
      expect(result.summary.appointments.change).toBe(100);
    });

    it('[Edge] Computes exactly -100% growth when current is 0 but previous > 0 (full decline)', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 0, patients: 0, appointments: 0 },
        previous: { revenue: 4000, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      const result = await dashboardService.getStats({ period: 'today' });
      expect(result.summary.revenue.change).toBe(-100);
      expect(result.summary.revenue.growth).toBe('-100%');
    });

    it('[Edge] Computes 0% growth when both current and previous are 0', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 0, patients: 0, appointments: 0 },
        previous: { revenue: 0, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      const result = await dashboardService.getStats({ period: 'today' });
      expect(result.summary.revenue.change).toBe(0);
      expect(result.summary.patients.change).toBe(0);
    });

    it('[Business Logic] Includes both current and previous windows in period', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 0, patients: 0, appointments: 0 },
        previous: { revenue: 0, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      const result = await dashboardService.getStats({ period: 'today' });

      expect(result.period).toHaveProperty('label');
      expect(result.period).toHaveProperty('current');
      expect(result.period).toHaveProperty('previous');
    });

    it('[Business Logic] Forwards startDate and endDate to the repo calls for custom date range', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 0, patients: 0, appointments: 0 },
        previous: { revenue: 0, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      await dashboardService.getStats({ startDate: '2025-01-01', endDate: '2025-01-31' });

      expect(mockedDashboardRepo.getComparativeMetrics).toHaveBeenCalledWith(
        '2025-01-01', '2025-01-31',
        expect.any(String), expect.any(String)
      );
    });

    it('[Implementation] Executes repository calls in parallel using Promise.all', async () => {
      const promiseAllSpy = jest.spyOn(Promise, 'all');

      mockedDashboardRepo.getComparativeMetrics.mockResolvedValue({
        current: { revenue: 0, patients: 0, appointments: 0 },
        previous: { revenue: 0, patients: 0, appointments: 0 },
      });
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      await dashboardService.getStats({ period: 'today' });

      expect(promiseAllSpy).toHaveBeenCalled();
      promiseAllSpy.mockRestore();
    });

    it('[Error] Gracefully rejects on repository failure', async () => {
      mockedDashboardRepo.getComparativeMetrics.mockRejectedValue(new Error('DB error'));
      await expect(dashboardService.getStats({ period: 'today' })).rejects.toThrow('DB error');
    });
  });

  describe('getAdminSummary()', () => {
    it('[Business Logic] Computes today_missed as the difference (appointments – attended)', async () => {
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 8, today_attended: 5 }),
      );
      const result = await dashboardService.getAdminSummary();
      expect(result.counts.today_missed).toBe(3);
    });

    it('[Business Logic] Computes attendance_percentage correctly', async () => {
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 8, today_attended: 6 }),
      );
      const result = await dashboardService.getAdminSummary();
      expect(result.analytics.attendance_percentage).toBe(75);
    });

    it('[Edge] Returns attendance_percentage of 0 when today_appointments is 0', async () => {
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 0, today_attended: 0 }),
      );
      const result = await dashboardService.getAdminSummary();
      expect(result.analytics.attendance_percentage).toBe(0);
    });

    it('[Edge] Clamps today_missed at 0 even if attended > appointments (data anomaly)', async () => {
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 3, today_attended: 5 }),
      );
      const result = await dashboardService.getAdminSummary();
      expect(result.counts.today_missed).toBe(0);
    });

    it('[Edge] Returns 0 for all counts when database is empty', async () => {
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({
          total_patients:     0,
          total_doctors:      0,
          today_appointments: 0,
          today_attended:     0,
          dept_activity:      [],
        }),
      );
      const result = await dashboardService.getAdminSummary();
      expect(result.counts.total_patients).toBe(0);
      expect(result.counts.today_missed).toBe(0);
      expect(result.analytics.attendance_percentage).toBe(0);
    });

    it('[Business Logic] Returns appointment_count as a number (not string) in dept_activity', async () => {
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({
          dept_activity: [
            { department: 'Cardiology', code: 'CARD', appointment_count: '6' as any },
          ],
        })
      );
      const result = await dashboardService.getAdminSummary();
      expect(typeof result.analytics.dept_activity[0].appointment_count).toBe('number');
      expect(result.analytics.dept_activity[0].appointment_count).toBe(6);
    });

    it('[Error] Handles global stats repository failure', async () => {
      mockedDashboardRepo.getGlobalStats.mockRejectedValue(new Error('Global Stats DB error'));
      await expect(dashboardService.getAdminSummary()).rejects.toThrow('Global Stats DB error');
    });
  });
});
