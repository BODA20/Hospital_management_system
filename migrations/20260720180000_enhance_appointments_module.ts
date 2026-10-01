import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Expand appointment_status enum in PostgreSQL
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'appointment_status' AND enumlabel = 'pending') THEN
        ALTER TYPE appointment_status ADD VALUE 'pending';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'appointment_status' AND enumlabel = 'confirmed') THEN
        ALTER TYPE appointment_status ADD VALUE 'confirmed';
      END IF;
    END $$;
  `);

  // 2. Add appointment_date, time_slot, reason to appointments table
  const hasApptDate = await knex.schema.hasColumn('appointments', 'appointment_date');
  if (!hasApptDate) {
    await knex.schema.alterTable('appointments', (table) => {
      table.date('appointment_date').nullable();
    });
  }

  const hasTimeSlot = await knex.schema.hasColumn('appointments', 'time_slot');
  if (!hasTimeSlot) {
    await knex.schema.alterTable('appointments', (table) => {
      table.string('time_slot', 50).nullable();
    });
  }

  const hasReason = await knex.schema.hasColumn('appointments', 'reason');
  if (!hasReason) {
    await knex.schema.alterTable('appointments', (table) => {
      table.text('reason').nullable();
    });
  }

  // 3. Create composite index for concurrency & availability lookup
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_slot
    ON appointments (doctor_id, appointment_date, time_slot);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointments', (table) => {
    table.dropColumn('appointment_date');
    table.dropColumn('time_slot');
    table.dropColumn('reason');
  });
}
