import type { Knex } from 'knex';

/**
 * Extend the appointments table with three new columns required by the
 * Receptionist Portal and Live Queue Counter Engine:
 *
 *  • queue_number    – INTEGER, auto-assigned per doctor per date for every
 *                      confirmed appointment (1, 2, 3 …).  Nullable so that
 *                      legacy / online appointments that don't yet have one
 *                      are unaffected.
 *
 *  • booking_source  – VARCHAR enum: 'online' | 'walk_in'.  Defaults to
 *                      'online' so existing rows stay consistent.
 *
 *  • payment_status  – VARCHAR enum: 'unpaid' | 'paid_cash' | 'paid_online'.
 *                      Defaults to 'unpaid' for existing rows.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointments', (table) => {
    table
      .integer('queue_number')
      .nullable()
      .comment('Ordinal position in the doctor\'s queue for the day (1-based)');

    table
      .string('booking_source', 20)
      .notNullable()
      .defaultTo('online')
      .comment('How the appointment was created: online | walk_in');

    table
      .string('payment_status', 20)
      .notNullable()
      .defaultTo('unpaid')
      .comment('Payment state: unpaid | paid_cash | paid_online');
  });

  // Add check constraints for the enum-like columns
  await knex.raw(`
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_booking_source_check
      CHECK (booking_source IN ('online', 'walk_in'))
  `);

  await knex.raw(`
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid_cash', 'paid_online'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop constraints first, then columns
  await knex.raw(`
    ALTER TABLE appointments
      DROP CONSTRAINT IF EXISTS appointments_booking_source_check,
      DROP CONSTRAINT IF EXISTS appointments_payment_status_check
  `);

  await knex.schema.alterTable('appointments', (table) => {
    table.dropColumn('queue_number');
    table.dropColumn('booking_source');
    table.dropColumn('payment_status');
  });
}
