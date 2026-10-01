import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('patient_vitals', (table) => {
    table.increments('id').primary();
    table.integer('patient_id').unsigned().notNullable()
      .references('id').inTable('patients').onDelete('CASCADE');
    table.integer('nurse_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.decimal('blood_pressure_sys', 5, 2).nullable();
    table.decimal('blood_pressure_dia', 5, 2).nullable();
    table.decimal('temperature', 5, 2).nullable();
    table.integer('heart_rate').nullable();
    table.integer('respiratory_rate').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('patient_vitals');
}
