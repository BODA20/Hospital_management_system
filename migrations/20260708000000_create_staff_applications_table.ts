import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('staff_applications', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .enu('requested_role', ['doctor', 'nurse'], {
        useNative: true,
        enumName: 'requested_role_app',
      })
      .notNullable();

    table.text('specialization_notes').nullable();

    table
      .enu('status', ['pending', 'approved', 'rejected'], {
        useNative: true,
        enumName: 'staff_application_status',
      })
      .notNullable()
      .defaultTo('pending');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['status', 'created_at']);
    table.index(['requested_role', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('staff_applications');
  await knex.raw('DROP TYPE IF EXISTS requested_role_app');
  await knex.raw('DROP TYPE IF EXISTS staff_application_status');
}
