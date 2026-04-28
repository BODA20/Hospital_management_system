import * as appointmentsService from '../../src/modules/appointments/services/appo.service';
import { appError } from '../../src/common/errors/AppError';

// Mock Dependencies
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

jest.mock('../../src/modules/appointments/repositories/appo.repo', () => require('../mocks/appointmentsRepo.mock').mockedAppointmentsRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);

import { mockedAppointmentsRepo } from '../mocks/appointmentsRepo.mock';
import { mockedPatientRepo } from '../mocks/patientsRepo.mock';
import { mockedDoctorsRepo } from '../mocks/doctorsRepo.mock';

const FUTURE_DATE = new Date();
FUTURE_DATE.setDate(FUTURE_DATE.getDate() + 2);
const FUTURE_ISO = FUTURE_DATE.toISOString();

// Shared Fixtures
const MOCK_APPOINTMENT = {
  id: 1,
  patient_id: 1,
  doctor_id: 1,
  starts_at: new Date(FUTURE_ISO),
  ends_at: new Date(new Date(FUTURE_ISO).getTime() + 30 * 60000),  // always +30 min
  status: 'scheduled' as const,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const VALID_BOOK_BODY = {
  doctor_id: 1,
  starts_at: FUTURE_ISO,
  notes: 'Regular checkup',
};

const MOCK_PATIENT = {
  id: 1,
  user_id: 1,
};

const MOCK_DOCTOR = {
  id: 1,
  user_id: 2,
  full_name: 'Dr. John Smith',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠  APPOINTMENTS SERVICE TESTS (Business Logic Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('SERVICE: appointmentsService (Business Logic Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppointmentsRepo.checkAvailability.mockResolvedValue(true);
    mockedAppointmentsRepo.createAppointment.mockResolvedValue(MOCK_APPOINTMENT as any);
    mockedPatientRepo.findByUserId.mockResolvedValue(MOCK_PATIENT as any);
    mockedDoctorsRepo.findById.mockResolvedValue(MOCK_DOCTOR as any);
    mockedDoctorsRepo.findByUserId.mockResolvedValue(MOCK_DOCTOR as any);
  });

  describe('createAppointment()', () => {
    describe('✅ Success — valid booking', () => {
      it('should create an appointment with scheduled status', async () => {
        const result = await appointmentsService.createAppointment(1, VALID_BOOK_BODY);
        expect(result).toEqual(MOCK_APPOINTMENT);
        expect(mockedAppointmentsRepo.createAppointment).toHaveBeenCalledWith(expect.objectContaining({
          status: 'scheduled',
          patient_id: 1,
        }));
      });

      it('should verify doctor availability before booking', async () => {
        await appointmentsService.createAppointment(1, VALID_BOOK_BODY);
        expect(mockedAppointmentsRepo.checkAvailability).toHaveBeenCalledWith(1, VALID_BOOK_BODY.starts_at);
      });
    });

    describe('❌ Failure — business rule violation', () => {
      it('should throw appError(404) when patient profile is missing', async () => {
        mockedPatientRepo.findByUserId.mockResolvedValue(null);
        await expect(appointmentsService.createAppointment(1, VALID_BOOK_BODY))
          .rejects.toMatchObject({
            statusCode: 404,
            message: expect.stringMatching(/patient profile not found/i),
          });
      });

      it('should throw appError(409) when there is a scheduling conflict', async () => {
        mockedAppointmentsRepo.checkAvailability.mockResolvedValue(false);
        await expect(appointmentsService.createAppointment(1, VALID_BOOK_BODY))
          .rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringMatching(/time slot is already booked/i),
          });
      });
    });
  });

  describe('getDoctorDailySchedule()', () => {
    const MOCK_SCHEDULE_ITEMS = [
      { id: 1, starts_at: new Date('2024-06-01T10:00:00Z'), status: 'scheduled', patient_name: 'John Doe', patient_email: 'john@example.com' },
      { id: 2, starts_at: new Date('2024-06-01T09:00:00Z'), status: 'completed', patient_name: 'Jane Doe', patient_email: 'jane@example.com' },
    ];

    describe('✅ Success', () => {
      it('should return correct metrics: total, remaining, completed', async () => {
        mockedAppointmentsRepo.getDoctorDailySchedule.mockResolvedValue(MOCK_SCHEDULE_ITEMS);
        
        const result = await appointmentsService.getDoctorDailySchedule(2);
        expect(result.total).toBe(2);
        expect(result.completed).toBe(1);
        // remaining depends on current time, but since 10:00 is scheduled, if we are before that, it's 1.
      });

      it('should flag _warning when patient contact info is missing', async () => {
        const incompleteItem = { id: 3, starts_at: new Date(), status: 'scheduled', patient_name: 'No Contact' };
        mockedAppointmentsRepo.getDoctorDailySchedule.mockResolvedValue([incompleteItem]);

        const result = await appointmentsService.getDoctorDailySchedule(2);
        expect(result.appointments[0]._warning).toContain('no contact info');
      });

      it('should return empty schedule when no appointments exist', async () => {
        mockedAppointmentsRepo.getDoctorDailySchedule.mockResolvedValue([]);
        const result = await appointmentsService.getDoctorDailySchedule(2);
        expect(result.total).toBe(0);
        expect(result.appointments).toHaveLength(0);
      });
    });
  });

  describe('updateStatus()', () => {
    describe('✅ Success', () => {
      it('should allow the assigned doctor to update the status', async () => {
        mockedAppointmentsRepo.findById.mockResolvedValue({ ...MOCK_APPOINTMENT, doctor_id: 1 });
        mockedAppointmentsRepo.updateStatus.mockResolvedValue([MOCK_APPOINTMENT]);
        
        const result = await appointmentsService.updateStatus(1, 'completed', { id: 2 }); // user.id 2 maps to doctor.id 1
        expect(result).toEqual(MOCK_APPOINTMENT);
      });
    });

    describe('❌ Failure — authorization / business rules', () => {
      it('should throw appError(403) when updating another doctor\'s appointment', async () => {
        mockedAppointmentsRepo.findById.mockResolvedValue({ ...MOCK_APPOINTMENT, doctor_id: 99 });
        
        await expect(appointmentsService.updateStatus(1, 'completed', { id: 2 }))
          .rejects.toMatchObject({
            statusCode: 403,
            message: expect.stringMatching(/not authorized/i),
          });
      });

      it('should throw appError(422) when trying to re-open a completed appointment', async () => {
        mockedAppointmentsRepo.findById.mockResolvedValue({ ...MOCK_APPOINTMENT, doctor_id: 1, status: 'completed' });
        
        await expect(appointmentsService.updateStatus(1, 'scheduled', { id: 2 }))
          .rejects.toMatchObject({
            statusCode: 422,
            message: expect.stringMatching(/cannot move a 'completed' appointment back to 'scheduled'/i),
          });
      });
    });
  });
});
