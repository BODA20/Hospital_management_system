import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'is_verified');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('is_verified').defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'is_verified');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('is_verified');
    });
  }
}
