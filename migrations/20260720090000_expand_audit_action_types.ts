import type { Knex } from 'knex';

/**
 * Expand the security_logs.action_type CHECK constraint to include all
 * action types added since the original table was created.
 *
 * The original migration (20260709000500) only included 16 action types.
 * Subsequent audit-sweep additions (STAFF_REQUEST_APPROVED, etc.) were
 * silently rejected by Postgres's CHECK constraint, causing the fire-and-forget
 * insertLog() calls to fail without surfacing an error to the caller.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE security_logs
      DROP CONSTRAINT IF EXISTS security_logs_action_type_check
  `);

  const allTypes = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'USER_BANNED', 'USER_UNBANNED', 'ROLE_CHANGED', 'LEAVE_REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'ACCOUNT_CREATED', 'APPOINTMENT_BOOKED', 'DEPARTMENT_CREATED', 'DEPARTMENT_DELETED', 'STAFF_ASSIGNED_TO_DEPARTMENT', 'ASSIGN_STAFF_DEPARTMENT', 'STAFF_APPLICATION_SUBMITTED', 'STAFF_REQUEST_APPROVED', 'STAFF_REQUEST_REJECTED', 'USER_DEACTIVATED', 'USER_PROFILE_UPDATED', 'NURSE_CREATED', 'NURSE_UPDATED', 'NURSE_DELETED', 'DOCTOR_UPDATED', 'PATIENT_CREATED', 'PATIENT_DELETED', 'VISIT_CREATED', 'VISIT_DELETED', 'PAYMENT_PROCESSED', 'APPOINTMENT_STATUS_UPDATED'];
  const arrayLiteral = allTypes.map((t: string) => `'${t}'::text`).join(', ');

  await knex.raw(`
    ALTER TABLE security_logs
      ADD CONSTRAINT security_logs_action_type_check
      CHECK (action_type = ANY (ARRAY[${arrayLiteral}]))
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Restore original 16-type constraint
  await knex.raw(`
    ALTER TABLE security_logs
      DROP CONSTRAINT IF EXISTS security_logs_action_type_check
  `);
  await knex.raw(`
    ALTER TABLE security_logs
      ADD CONSTRAINT security_logs_action_type_check
      CHECK (action_type = ANY (ARRAY[
        'LOGIN_SUCCESS'::text, 'LOGIN_FAILED'::text, 'LOGOUT'::text,
        'PASSWORD_CHANGE'::text, 'USER_BANNED'::text, 'USER_UNBANNED'::text,
        'ROLE_CHANGED'::text, 'LEAVE_REQUEST_SUBMITTED'::text,
        'REQUEST_APPROVED'::text, 'REQUEST_REJECTED'::text,
        'ACCOUNT_CREATED'::text, 'APPOINTMENT_BOOKED'::text,
        'DEPARTMENT_CREATED'::text, 'DEPARTMENT_DELETED'::text,
        'STAFF_ASSIGNED_TO_DEPARTMENT'::text, 'ASSIGN_STAFF_DEPARTMENT'::text
      ]))
  `);
}
