import type { Knex } from 'knex';

/**
 * Add license_number column to doctors and nurses tables.
 * Uses hasColumn guards so it is fully idempotent and safe to re-run.
 */
export async function up(knex: Knex): Promise<void> {
  const doctorsHasLicense = await knex.schema.hasColumn('doctors', 'license_number');
  if (!doctorsHasLicense) {
    await knex.schema.alterTable('doctors', (table) => {
      table.string('license_number', 100).nullable();
    });
  }

  const nursesHasLicense = await knex.schema.hasColumn('nurses', 'license_number');
  if (!nursesHasLicense) {
    await knex.schema.alterTable('nurses', (table) => {
      table.string('license_number', 100).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const doctorsHasLicense = await knex.schema.hasColumn('doctors', 'license_number');
  if (doctorsHasLicense) {
    await knex.schema.alterTable('doctors', (table) => {
      table.dropColumn('license_number');
    });
  }
  const nursesHasLicense = await knex.schema.hasColumn('nurses', 'license_number');
  if (nursesHasLicense) {
    await knex.schema.alterTable('nurses', (table) => {
      table.dropColumn('license_number');
    });
  }
}
