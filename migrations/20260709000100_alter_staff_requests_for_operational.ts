import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Alter staff_requests table
  await knex.schema.alterTable('staff_requests', (table) => {
    // Drop unique constraint on user_id
    table.dropUnique(['user_id']);
    
    // Add columns
    table.string('request_type', 100).nullable();
    table.text('description').nullable();
    
    // Make requested_role nullable
    table.string('requested_role', 50).nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('staff_requests', (table) => {
    // Add unique constraint back
    table.unique(['user_id']);
    
    // Drop columns
    table.dropColumn('request_type');
    table.dropColumn('description');
    
    // Restore requested_role to notNullable enum
    table.string('requested_role', 50).notNullable().alter();
  });
}
