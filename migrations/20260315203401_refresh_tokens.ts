import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('token_hash', 255).notNullable();

    table.timestamp('expires_at').notNullable();

    table.boolean('revoked').defaultTo(false);

    table.timestamp('revoked_at').nullable();

    table
      .integer('replaced_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('refresh_tokens');

    table.string('user_agent').nullable();
    table.string('ip').nullable();

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('refresh_tokens');
}
