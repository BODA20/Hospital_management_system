import * as departmentsService from '../../src/modules/department/services/department.service';
import { appError } from '../../src/common/errors/AppError';

// Mock Dependencies
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

jest.mock('../../src/modules/department/repositories/department.repo', () => require('../mocks/departmentsRepo.mock').mockedDepartmentsRepo);

import { mockedDepartmentsRepo } from '../mocks/departmentsRepo.mock';

// Shared Fixtures
const MOCK_DEPARTMENT = {
  id: 1,
  name: 'Cardiology',
  code: 'CARD',
  description: 'Heart and cardiovascular care',
  head_doctor_id: 1,
  head_doctor_name: 'Dr. John Smith',
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

const VALID_CREATE_BODY = {
  name: 'Cardiology',
  code: 'CARD',
  description: 'Heart and cardiovascular care',
  head_doctor_id: 1,
};

const MOCK_DEPARTMENTS_LIST = [MOCK_DEPARTMENT];

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠  DEPARTMENTS SERVICE TESTS (Business Logic Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('SERVICE: departmentsService (Business Logic Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDepartmentsRepo.getAllDepartments.mockResolvedValue(MOCK_DEPARTMENTS_LIST as any);
    mockedDepartmentsRepo.countDepartments.mockResolvedValue(0);
  });

  describe('createDepartment()', () => {
    describe('✅ Success — valid payload', () => {
      it('should save to DB and return the new department', async () => {
        mockedDepartmentsRepo.createDepartment.mockResolvedValue(MOCK_DEPARTMENT as any);
        const result = await departmentsService.createDepartment(VALID_CREATE_BODY);
        expect(result).toEqual(MOCK_DEPARTMENT);
        expect(mockedDepartmentsRepo.createDepartment).toHaveBeenCalledWith(VALID_CREATE_BODY);
      });
    });

    describe('❌ Failure — business rule violation', () => {
      it('should throw appError(400) when department limit (5) is reached', async () => {
        mockedDepartmentsRepo.countDepartments.mockResolvedValue(5);
        await expect(departmentsService.createDepartment(VALID_CREATE_BODY))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Maximum number of departments (5) reached. Cannot create more departments.',
          });
      });
    });
  });

  describe('getAllDepartments()', () => {
    describe('✅ Success', () => {
      it('should return enriched list with head_doctor_name', async () => {
        const result = await departmentsService.getAllDepartments();
        expect(result).toEqual(MOCK_DEPARTMENTS_LIST);
        expect(result[0]).toHaveProperty('head_doctor_name');
      });

      it('should return empty array when no departments exist', async () => {
        mockedDepartmentsRepo.getAllDepartments.mockResolvedValue([] as any);
        const result = await departmentsService.getAllDepartments();
        expect(result).toEqual([]);
      });
    });
  });

  describe('getDepartmentById()', () => {
    describe('✅ Success', () => {
      it('should return department with joined head doctor name', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT as any);
        const result = await departmentsService.getDepartmentById(1);
        expect(result).toEqual(MOCK_DEPARTMENT);
      });
    });

    describe('❌ Failure — not found', () => {
      it('should throw appError(404) when ID does not exist', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(undefined);
        await expect(departmentsService.getDepartmentById(999))
          .rejects.toMatchObject({
            statusCode: 404,
          });
      });
    });
  });

  describe('updateDepartment()', () => {
    describe('✅ Success', () => {
      it('should update metadata and head doctor', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT as any);
        mockedDepartmentsRepo.updateDepartment.mockResolvedValue({ ...MOCK_DEPARTMENT, name: 'New Name' } as any);
        
        const result = await departmentsService.updateDepartment(1, { name: 'New Name' });
        expect(result.name).toBe('New Name');
        expect(mockedDepartmentsRepo.updateDepartment).toHaveBeenCalledWith(1, { name: 'New Name' });
      });
    });
  });

  describe('deleteDepartment()', () => {
    describe('✅ Success', () => {
      it('should delete department when no doctors are assigned', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT as any);
        mockedDepartmentsRepo.countDoctorsInDepartment.mockResolvedValue(0);
        
        const result = await departmentsService.deleteDepartment(1);
        expect(result.message).toMatch(/deleted successfully/i);
        expect(mockedDepartmentsRepo.deleteDepartment).toHaveBeenCalledWith(1);
      });
    });

    describe('❌ Failure — business rule violation', () => {
      it('should throw appError(400) when department still has assigned doctors', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT as any);
        mockedDepartmentsRepo.countDoctorsInDepartment.mockResolvedValue(3);
        
        await expect(departmentsService.deleteDepartment(1))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Cannot delete this department — 3 doctor(s) are still assigned to it. Reassign them first.',
          });
      });
    });
  });
});
