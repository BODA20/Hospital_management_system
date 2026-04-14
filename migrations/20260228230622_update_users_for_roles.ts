import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table
      .enu('role', ['patient', 'doctor', 'nurse', 'receptionist', 'admin'], {
        useNative: true,
        enumName: 'user_role',
      })
      .notNullable()
      .defaultTo('patient');

    // maked new table for staff requests and link to users

    table.timestamp('approved_at').nullable();
    table.integer('approved_by').unsigned().nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn('users', 'staff_status');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('approved_by');
    table.dropColumn('approved_at');
    table.dropColumn('requested_role');
     if (exists) {
      table.dropColumn('staff_status');
    }
    table.dropColumn('role');
  });
}
