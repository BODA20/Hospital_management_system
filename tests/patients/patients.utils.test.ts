import { calculateAge } from '../../src/modules/patients/services/patient.service';

describe('PATIENTS UTILS (Pure Functions)', () => {
  describe('calculateAge() pure function', () => {
    it('[AGE-001] returns null for null input', () => { 
      expect(calculateAge(null as any)).toBeNull(); 
    });
    
    it('[AGE-002] returns null for invalid date string', () => { 
      expect(calculateAge('not-a-date')).toBeNull(); 
    });
    
    it('[AGE-003] returns 0 for newborn today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(calculateAge(today)).toBe(0);
    });
    
    it('[AGE-004] returns positive number for past DOB', () => {
      const result = calculateAge('1990-01-01');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(30);
    });
    
    it('[AGE-005] correctly handles birthday that has not occurred this year yet', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextYear = nextMonth.getFullYear();
      const dob = new Date(nextYear - 30, nextMonth.getMonth(), nextMonth.getDate()).toISOString().split('T')[0];
      const age = calculateAge(dob);
      expect(age).toBe(29);
    });
  });
});
