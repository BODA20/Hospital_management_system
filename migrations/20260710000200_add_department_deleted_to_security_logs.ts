import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Drop the old check constraint
  await knex.schema.raw(
    'ALTER TABLE security_logs DROP CONSTRAINT security_logs_action_type_check;'
  );

  // Add the new check constraint including DEPARTMENT_DELETED
  await knex.schema.raw(
    `ALTER TABLE security_logs ADD CONSTRAINT security_logs_action_type_check CHECK (action_type = ANY (ARRAY['LOGIN_SUCCESS'::text, 'LOGIN_FAILED'::text, 'LOGOUT'::text, 'PASSWORD_CHANGE'::text, 'USER_BANNED'::text, 'USER_UNBANNED'::text, 'ROLE_CHANGED'::text, 'LEAVE_REQUEST_SUBMITTED'::text, 'REQUEST_APPROVED'::text, 'REQUEST_REJECTED'::text, 'ACCOUNT_CREATED'::text, 'APPOINTMENT_BOOKED'::text, 'DEPARTMENT_DELETED'::text]));`
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(
    'ALTER TABLE security_logs DROP CONSTRAINT security_logs_action_type_check;'
  );

  await knex.schema.raw(
    `ALTER TABLE security_logs ADD CONSTRAINT security_logs_action_type_check CHECK (action_type = ANY (ARRAY['LOGIN_SUCCESS'::text, 'LOGIN_FAILED'::text, 'LOGOUT'::text, 'PASSWORD_CHANGE'::text, 'USER_BANNED'::text, 'USER_UNBANNED'::text, 'ROLE_CHANGED'::text, 'LEAVE_REQUEST_SUBMITTED'::text, 'REQUEST_APPROVED'::text, 'REQUEST_REJECTED'::text, 'ACCOUNT_CREATED'::text, 'APPOINTMENT_BOOKED'::text]));`
  );
}
