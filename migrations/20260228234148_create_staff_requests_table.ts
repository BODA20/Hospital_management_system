import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('staff_requests', (table) => {
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
      .enu('requested_role', ['doctor', 'nurse', 'receptionist'], {
        useNative: true,
        enumName: 'requested_role',
      })
      .notNullable();

    table
      .enu('status', ['pending', 'approved', 'rejected'], {
        useNative: true,
        enumName: 'staff_request_status',
      })
      .notNullable()
      .defaultTo('pending');

    table
      .integer('approved_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users');
    table.timestamp('approved_at').nullable();
    table.text('rejection_reason').nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['status', 'created_at']);
    table.index(['requested_role', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('staff_requests');
}
