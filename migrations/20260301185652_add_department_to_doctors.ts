import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doctors', (table) => {
    table
      .integer('department_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('departments')
      .onDelete('RESTRICT');

    table.index(['department_id']);

    table.integer('years_of_experience').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doctors', (table) => {
    table.dropColumn('department_id');
  });
}
