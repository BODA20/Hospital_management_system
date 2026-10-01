import type { Knex } from 'knex';

/**
 * Migration: Prevent cross-channel double-booking via a unique partial index.
 *
 * This enforces that no two active appointments (status not in cancelled/missed/no_show)
 * can exist for the same doctor on the same date at the same time_slot.
 *
 * The index is PARTIAL (WHERE status NOT IN (...)) so it only applies to active
 * appointments, allowing the same slot to be re-used after a cancellation.
 *
 * This is the last-resort database-level guard that complements the application-level
 * checkAvailability() check and prevents race-condition double-bookings.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_doctor_date_slot_active
    ON appointments (doctor_id, appointment_date, time_slot)
    WHERE status NOT IN ('cancelled', 'missed', 'no_show');
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS uq_appointments_doctor_date_slot_active;
  `);
}
