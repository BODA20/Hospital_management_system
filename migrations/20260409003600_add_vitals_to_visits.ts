import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('visits', (table) => {
    // Stores structured vitals as JSONB: { bp, pulse, temperature, weight }
    table.jsonb('vitals').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('visits', (table) => {
    table.dropColumn('vitals');
  });
}
