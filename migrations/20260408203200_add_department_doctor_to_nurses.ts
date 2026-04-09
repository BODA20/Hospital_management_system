import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table
      .integer('department_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('departments')
      .onDelete('RESTRICT');

    table
      .integer('doctor_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('doctors')
      .onDelete('RESTRICT');

    table.index(['department_id']);
    table.index(['doctor_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.dropColumn('department_id');
    table.dropColumn('doctor_id');
  });
}
