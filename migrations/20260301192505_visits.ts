import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('visits', (table) => {
    table.increments('id').primary();

    table
      .integer('patient_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('patients')
      .onDelete('RESTRICT');

    table
      .integer('doctor_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('doctors')
      .onDelete('RESTRICT');

    table
      .integer('appointment_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('appointments')
      .onDelete('SET NULL');

    table
      .integer('department_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('departments')
      .onDelete('SET NULL');

    table
      .enu('status', ['in_progress', 'completed', 'cancelled'], {
        useNative: true,
        enumName: 'visit_status',
      })
      .notNullable()
      .defaultTo('in_progress');

    table
      .timestamp('check_in_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('check_out_at', { useTz: true }).nullable();

    table.string('chief_complaint', 255).nullable();
    table.text('diagnosis').nullable();
    table.text('treatment_plan').nullable();
    table.text('notes').nullable();

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes
    table.index(['patient_id', 'check_in_at']);
    table.index(['doctor_id', 'check_in_at']);
    table.index(['appointment_id']);
    table.index(['department_id']);
    table.index(['status', 'check_in_at']);
  });

  await knex.raw(`
    ALTER TABLE visits
    ADD CONSTRAINT visit_checkout_after_checkin
    CHECK (check_out_at IS NULL OR check_out_at > check_in_at);
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS visits_unique_appointment
    ON visits (appointment_id)
    WHERE appointment_id IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS visits_unique_appointment;`);
  await knex.schema.dropTableIfExists('visits');
}
