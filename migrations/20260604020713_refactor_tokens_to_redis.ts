import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_reset_token');
    table.dropColumn('password_reset_expires');
    table.dropColumn('email_change_token');
    table.dropColumn('pending_email');
    table.dropColumn('email_change_expires');
  });

  await knex.schema.dropTableIfExists('refresh_tokens');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique();
    table.boolean('revoked').defaultTo(false);
    table.timestamp('expires_at').notNullable();
    table.string('user_agent', 255);
    table.string('ip', 45);
    table.timestamp('revoked_at');
    table.integer('replaced_by');
    table.timestamps(true, true);
  });

  await knex.schema.alterTable('users', (table) => {
    table.string('password_reset_token', 255);
    table.timestamp('password_reset_expires');
    table.string('email_change_token', 255);
    table.string('pending_email', 255);
    table.timestamp('email_change_expires');
  });
}
