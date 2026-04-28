import * as visitsService from '../../src/modules/visits/services/visit.service';
import { appError } from '../../src/common/errors/AppError';

// Mock Dependencies
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

jest.mock('../../src/modules/visits/repositories/visit.repository', () => require('../mocks/visitsRepo.mock').mockedVisitsRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/appointments/repositories/appo.repo', () => require('../mocks/appoRepo.mock').mockedAppoRepo);
jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/billing/services/billing.service', () => require('../mocks/billingService.mock').mockedBillingService);

import { mockedVisitsRepo } from '../mocks/visitsRepo.mock';
import { mockedDoctorsRepo } from '../mocks/doctorsRepo.mock';
import { mockedPatientRepo } from '../mocks/patientsRepo.mock';
import { mockedAppoRepo } from '../mocks/appoRepo.mock';
import { mockedNursesRepo } from '../mocks/nursesRepo.mock';
import { mockedBillingService } from '../mocks/billingService.mock';

// Shared Fixtures
const MOCK_VISIT = {
  id: 1,
  patient_id: 1,
  doctor_id: 1,
  nurse_id: null,
  appointment_id: 1,
  department_id: 1,
  status: 'awaiting_vitals' as const,
  check_in_at: new Date('2024-06-01T10:00:00Z'),
  check_out_at: null,
  chief_complaint: 'Headache',
  diagnosis: 'Pending',
  treatment_plan: null,
  notes: null,
  vitals: null,
  created_at: new Date('2024-06-01T10:00:00Z'),
  updated_at: new Date('2024-06-01T10:00:00Z'),
};

const MOCK_VISIT_DETAIL = {
  ...MOCK_VISIT,
  patient_name: 'John Doe',
  patient_email: 'john@example.com',
  doctor_name: 'Dr. Smith',
  department_name: 'General Medicine',
};

const CREATE_VISIT_INPUT = {
  patient_id: 1,
  doctor_id: 1,
  appointment_id: 1,
  reason_for_visit: 'Headache',
  diagnosis: 'Pending',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠  VISITS SERVICE TESTS (Business Logic Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('SERVICE: visitsService (Business Logic Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVisit()', () => {
    beforeEach(() => {
      mockedPatientRepo.findById.mockResolvedValue({ id: 1, full_name: 'John Doe' } as any);
      mockedDoctorsRepo.findById.mockResolvedValue({ id: 1, consultation_fee: 100 } as any);
      mockedAppoRepo.findById.mockResolvedValue({ id: 1, patient_id: 1, doctor_id: 1, status: 'scheduled' } as any);
      mockedVisitsRepo.createVisit.mockResolvedValue(MOCK_VISIT as any);
      mockedVisitsRepo.getVisitDetails.mockResolvedValue(MOCK_VISIT_DETAIL as any);
    });

    describe('✅ Success — valid payload', () => {
      it('should create a visit and auto-complete the appointment', async () => {
        const result = await visitsService.createVisit(CREATE_VISIT_INPUT);
        expect(result).toEqual(MOCK_VISIT_DETAIL);
        expect(mockedVisitsRepo.createVisit).toHaveBeenCalledWith(CREATE_VISIT_INPUT);
        expect(mockedAppoRepo.updateStatus).toHaveBeenCalledWith(1, 'completed');
      });
    });

    describe('❌ Failure — invalid data', () => {
      it('should throw appError(404) when patient is not found', async () => {
        mockedPatientRepo.findById.mockResolvedValue(undefined);
        await expect(visitsService.createVisit(CREATE_VISIT_INPUT)).rejects.toMatchObject({
          statusCode: 404,
          message: /patient with id 1 not found/i,
        });
      });

      it('should throw appError(404) when doctor is not found', async () => {
        mockedDoctorsRepo.findById.mockResolvedValue(undefined);
        await expect(visitsService.createVisit(CREATE_VISIT_INPUT)).rejects.toMatchObject({
          statusCode: 404,
          message: /doctor with id 1 not found/i,
        });
      });

      it('should throw appError(422) when appointment does not belong to patient', async () => {
        mockedAppoRepo.findById.mockResolvedValue({ id: 1, patient_id: 999, doctor_id: 1 } as any);
        await expect(visitsService.createVisit(CREATE_VISIT_INPUT)).rejects.toMatchObject({
          statusCode: 422,
          message: /does not belong to patient/i,
        });
      });
    });
  });

  describe('getAllVisits()', () => {
    describe('✅ Success', () => {
      it('should return a list of visits', async () => {
        mockedVisitsRepo.getAllVisits.mockResolvedValue([MOCK_VISIT_DETAIL] as any);
        const result = await visitsService.getAllVisits();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(MOCK_VISIT_DETAIL);
      });

      it('should return an empty list when no visits exist', async () => {
        mockedVisitsRepo.getAllVisits.mockResolvedValue([] as any);
        const result = await visitsService.getAllVisits();
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('getVisitById()', () => {
    describe('✅ Success', () => {
      it('should return visit details when found', async () => {
        mockedVisitsRepo.getVisitDetails.mockResolvedValue(MOCK_VISIT_DETAIL as any);
        const result = await visitsService.getVisitById(1);
        expect(result).toEqual(MOCK_VISIT_DETAIL);
      });
    });

    describe('❌ Failure — not found', () => {
      it('should throw appError(404) when visit does not exist', async () => {
        mockedVisitsRepo.getVisitDetails.mockResolvedValue(undefined);
        await expect(visitsService.getVisitById(999)).rejects.toMatchObject({
          statusCode: 404,
        });
      });
    });
  });

  describe('updateVisit()', () => {
    beforeEach(() => {
      mockedVisitsRepo.findRawById.mockResolvedValue(MOCK_VISIT as any);
      mockedVisitsRepo.updateVisit.mockResolvedValue({ ...MOCK_VISIT, status: 'in_progress' } as any);
      mockedVisitsRepo.getVisitDetails.mockResolvedValue({ ...MOCK_VISIT_DETAIL, status: 'in_progress' } as any);
    });

    describe('✅ Success', () => {
      it('should update visit status', async () => {
        const result = await visitsService.updateVisit(1, { status: 'in_progress' });
        expect(result.status).toBe('in_progress');
        expect(mockedVisitsRepo.updateVisit).toHaveBeenCalled();
      });

      it('should create an invoice when visit is completed', async () => {
        mockedDoctorsRepo.findById.mockResolvedValue({ id: 1, consultation_fee: 100 } as any);
        const result = await visitsService.updateVisit(1, { status: 'completed' });
        expect(mockedBillingService.createInitialInvoice).toHaveBeenCalled();
      });
    });

    describe('❌ Failure — invalid state transition', () => {
      it('should throw appError(422) when trying to reopen a completed visit', async () => {
        mockedVisitsRepo.findRawById.mockResolvedValue({ ...MOCK_VISIT, status: 'completed' } as any);
        await expect(visitsService.updateVisit(1, { status: 'in_progress' })).rejects.toMatchObject({
          statusCode: 422,
          message: /cannot move a 'completed' visit back to 'in_progress'/i,
        });
      });
    });
  });

  describe('deleteVisit()', () => {
    describe('✅ Success', () => {
      it('should cancel the visit instead of hard deleting', async () => {
        mockedVisitsRepo.findRawById.mockResolvedValue({ ...MOCK_VISIT, status: 'awaiting_vitals' } as any);
        const result = await visitsService.deleteVisit(1);
        expect(result.message).toMatch(/cancelled successfully/i);
        expect(mockedVisitsRepo.updateVisit).toHaveBeenCalledWith(1, { status: 'cancelled' });
      });
    });

    describe('❌ Failure — in progress', () => {
      it('should throw appError(422) when trying to delete an in-progress visit', async () => {
        mockedVisitsRepo.findRawById.mockResolvedValue({ ...MOCK_VISIT, status: 'in_progress' } as any);
        await expect(visitsService.deleteVisit(1)).rejects.toMatchObject({
          statusCode: 422,
          message: /cannot delete a visit that is still in progress/i,
        });
      });
    });
  });
});
