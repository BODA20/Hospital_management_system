import type { Knex } from 'knex';

/**
 * Add 'in_progress' to the appointment_status PostgreSQL enum.
 *
 * This value is needed to represent the intermediate state where a nurse has
 * checked a patient in and created a visit record, but the doctor has not yet
 * completed the consultation.  Without this value the appointments table rejects
 * the status update with pg error 22P02 ("invalid input value for enum").
 *
 * Flow: confirmed → in_progress (nurse check-in) → completed (doctor finalises)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
          JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
         WHERE pg_type.typname = 'appointment_status'
           AND enumlabel = 'in_progress'
      ) THEN
        ALTER TYPE appointment_status ADD VALUE 'in_progress';
      END IF;
    END
    $$;
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // PostgreSQL does not support removing enum values without recreating the type.
  // A full rollback would require a table rewrite; leaving as a no-op is intentional.
}
