import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('staff_operational_requests', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .enu('request_type', ['Leave Request', 'Shift Change', 'Operational Support'], {
        useNative: true,
        enumName: 'staff_operational_request_type',
      })
      .notNullable();

    table.text('description').notNullable();

    table
      .enu('status', ['pending', 'approved', 'rejected'], {
        useNative: true,
        enumName: 'staff_operational_request_status',
      })
      .notNullable()
      .defaultTo('pending');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['user_id']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('staff_operational_requests');
  await knex.raw('DROP TYPE IF EXISTS staff_operational_request_type');
  await knex.raw('DROP TYPE IF EXISTS staff_operational_request_status');
}
