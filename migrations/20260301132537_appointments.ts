import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);

  await knex.schema.createTable('appointments', (table) => {
    table.increments('id').primary();

    table
      .integer('doctor_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('doctors')
      .onDelete('RESTRICT');

    table
      .integer('patient_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('patients')
      .onDelete('RESTRICT');

    table.timestamp('starts_at', { useTz: true }).notNullable();
    table.timestamp('ends_at', { useTz: true }).notNullable();

    table
      .enu('status', ['scheduled', 'completed', 'cancelled', 'no_show'], {
        useNative: true,
        enumName: 'appointment_status',
      })
      .notNullable()
      .defaultTo('scheduled');

    table.text('notes').nullable();

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['doctor_id', 'starts_at']);
    table.index(['patient_id', 'starts_at']);
  });

  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT no_overlap_per_doctor
    EXCLUDE USING gist (
      doctor_id WITH =,
      tstzrange(starts_at, ends_at, '[)') WITH &&
    )
    WHERE (status = 'scheduled');
  `);

  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT ends_after_starts
    CHECK (ends_at > starts_at);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('appointments');
}
