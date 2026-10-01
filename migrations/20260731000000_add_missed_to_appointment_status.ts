import type { Knex } from 'knex';

/**
 * Add 'missed' to the appointment_status PostgreSQL enum.
 *
 * IMPORTANT: PostgreSQL requires ALTER TYPE … ADD VALUE to commit before the
 * new value can be referenced in DML within the same session.  Knex wraps
 * migrations in a transaction by default, which prevents the value from being
 * visible immediately.  We therefore disable the transaction wrapper here and
 * manage commits manually so the two steps execute in separate transactions.
 */
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // Transaction 1 – extend the enum (must commit before we can INSERT/UPDATE)
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'appointment_status'
          AND enumlabel = 'missed'
      ) THEN
        ALTER TYPE appointment_status ADD VALUE 'missed';
      END IF;
    END $$;
  `);

  // Transaction 2 – backfill all past-pending rows (new enum value now visible)
  await knex.raw(`
    UPDATE appointments
    SET    status     = 'missed',
           updated_at = NOW()
    WHERE  status     = 'pending'
      AND  starts_at  < NOW()
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Best-effort revert: flip missed rows back to pending.
  // The enum value itself cannot be dropped in PostgreSQL without full type rebuild.
  await knex.raw(`
    UPDATE appointments
    SET    status     = 'pending',
           updated_at = NOW()
    WHERE  status     = 'missed'
  `);
}
