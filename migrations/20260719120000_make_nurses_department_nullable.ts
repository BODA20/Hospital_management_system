import type { Knex } from 'knex';

/**
 * Make nurses.department_id nullable.
 *
 * Background: the original migration (20260408203200) added department_id as
 * NOT NULL with a FK reference to departments. However, the staff-application
 * approval pipeline deliberately leaves department_id NULL on new nurses because
 * department assignment is a separate admin action after onboarding.
 * Without this fix every nurse approval crashes with a NOT NULL constraint
 * violation and rolls back the entire transaction.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.integer('department_id').unsigned().nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('nurses', (table) => {
    table.integer('department_id').unsigned().notNullable().alter();
  });
}
