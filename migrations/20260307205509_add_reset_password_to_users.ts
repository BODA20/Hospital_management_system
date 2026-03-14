import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.string('password_reset_token').nullable();
    table.timestamp('password_reset_expires').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_reset_token');
    table.dropColumn('password_reset_expires');
  });
}
