import type { Knex } from 'knex';

/**
 * Add license_number to staff_applications so applicants can submit it
 * as part of their join-staff request.
 */
export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('staff_applications', 'license_number');
  if (!hasColumn) {
    await knex.schema.alterTable('staff_applications', (table) => {
      table.string('license_number', 100).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('staff_applications', 'license_number');
  if (hasColumn) {
    await knex.schema.alterTable('staff_applications', (table) => {
      table.dropColumn('license_number');
    });
  }
}
