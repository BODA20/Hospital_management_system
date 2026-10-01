import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('is_on_leave').notNullable().defaultTo(false);
    table.enum('assigned_shift', ['Morning', 'Night']).notNullable().defaultTo('Morning');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_on_leave');
    table.dropColumn('assigned_shift');
  });
}

