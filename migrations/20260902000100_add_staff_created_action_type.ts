import type { Knex } from 'knex';

/**
 * Adds STAFF_CREATED and STAFF_DELETED to the security_logs action_type CHECK constraint.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE security_logs
      DROP CONSTRAINT IF EXISTS security_logs_action_type_check
  `);

  const allTypes = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE',
    'USER_BANNED', 'USER_UNBANNED', 'ROLE_CHANGED', 'LEAVE_REQUEST_SUBMITTED',
    'REQUEST_APPROVED', 'REQUEST_REJECTED', 'ACCOUNT_CREATED', 'APPOINTMENT_BOOKED',
    'DEPARTMENT_CREATED', 'DEPARTMENT_DELETED', 'STAFF_ASSIGNED_TO_DEPARTMENT',
    'ASSIGN_STAFF_DEPARTMENT', 'STAFF_APPLICATION_SUBMITTED', 'STAFF_REQUEST_APPROVED',
    'STAFF_REQUEST_REJECTED', 'USER_DEACTIVATED', 'USER_PROFILE_UPDATED',
    'NURSE_CREATED', 'NURSE_UPDATED', 'NURSE_DELETED', 'DOCTOR_UPDATED',
    'PATIENT_CREATED', 'PATIENT_DELETED', 'VISIT_CREATED', 'VISIT_DELETED',
    'PAYMENT_PROCESSED', 'APPOINTMENT_STATUS_UPDATED',
    // Newly added:
    'STAFF_CREATED', 'STAFF_DELETED', 'STAFF_UPDATED',
  ];
  const arrayLiteral = allTypes.map((t: string) => `'${t}'::text`).join(', ');

  await knex.raw(`
    ALTER TABLE security_logs
      ADD CONSTRAINT security_logs_action_type_check
      CHECK (action_type = ANY (ARRAY[${arrayLiteral}]))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE security_logs
      DROP CONSTRAINT IF EXISTS security_logs_action_type_check
  `);

  const originalTypes = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE',
    'USER_BANNED', 'USER_UNBANNED', 'ROLE_CHANGED', 'LEAVE_REQUEST_SUBMITTED',
    'REQUEST_APPROVED', 'REQUEST_REJECTED', 'ACCOUNT_CREATED', 'APPOINTMENT_BOOKED',
    'DEPARTMENT_CREATED', 'DEPARTMENT_DELETED', 'STAFF_ASSIGNED_TO_DEPARTMENT',
    'ASSIGN_STAFF_DEPARTMENT', 'STAFF_APPLICATION_SUBMITTED', 'STAFF_REQUEST_APPROVED',
    'STAFF_REQUEST_REJECTED', 'USER_DEACTIVATED', 'USER_PROFILE_UPDATED',
    'NURSE_CREATED', 'NURSE_UPDATED', 'NURSE_DELETED', 'DOCTOR_UPDATED',
    'PATIENT_CREATED', 'PATIENT_DELETED', 'VISIT_CREATED', 'VISIT_DELETED',
    'PAYMENT_PROCESSED', 'APPOINTMENT_STATUS_UPDATED',
  ];
  const arrayLiteral = originalTypes.map((t: string) => `'${t}'::text`).join(', ');

  await knex.raw(`
    ALTER TABLE security_logs
      ADD CONSTRAINT security_logs_action_type_check
      CHECK (action_type = ANY (ARRAY[${arrayLiteral}]))
  `);
}
