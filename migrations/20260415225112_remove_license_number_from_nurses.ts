import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.dropColumn('license_number');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.string('license_number').notNullable();
  });
}