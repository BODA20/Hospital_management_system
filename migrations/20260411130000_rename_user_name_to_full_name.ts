import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Rename 'name' to 'full_name' to match the rest of the codebase
    table.renameColumn('name', 'full_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.renameColumn('full_name', 'name');
  });
}
