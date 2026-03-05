import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('nurses', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.string('license_number', 50).notNullable().unique();

    table
      .enu('shift', ['morning', 'evening', 'night'], {
        useNative: true,
        enumName: 'nurse_shift',
      })
      .notNullable();

    table.integer('years_of_experience').notNullable().defaultTo(0);

    table.text('notes').nullable();

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['shift']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('nurses');
}
