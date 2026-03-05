import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('departments', (table) => {
    table.increments('id').primary();

    table.string('name', 120).notNullable().unique();

    table.string('code', 20).notNullable().unique();

    table.text('description').nullable();

    table
      .integer('head_doctor_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('doctors')
      .onDelete('SET NULL');

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['name']);
    table.index(['code']);
    table.index(['head_doctor_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('departments');
}
