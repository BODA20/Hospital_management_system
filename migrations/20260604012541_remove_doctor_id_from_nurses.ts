import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.dropColumn('doctor_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.integer('doctor_id').unsigned().references('id').inTable('doctors').onDelete('SET NULL');
  });
}
