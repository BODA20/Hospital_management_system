import type { Knex } from 'knex';

// Knex wraps migrations in a transaction by default.
// PostgreSQL does NOT allow a newly-added enum value to be referenced
// (e.g., as a column default) within the SAME transaction.
// Disabling the transaction lets PostgreSQL commit the ADD VALUE before
// the ALTER COLUMN DEFAULT statement runs.
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // 1. Add enum values (must be committed before they can be used as defaults)
  await knex.raw(`ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'awaiting_vitals'`);
  await knex.raw(`ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'ready_for_doctor'`);

  // 2. Add nurse_id FK column (nullable — set when a nurse records vitals)
  await knex.schema.alterTable('visits', (table) => {
    table
      .integer('nurse_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('nurses')
      .onDelete('SET NULL');
  });

  // 3. Change the column default (safe now — enum values are committed above)
  await knex.raw(`ALTER TABLE visits ALTER COLUMN status SET DEFAULT 'awaiting_vitals'`);
}

export async function down(knex: Knex): Promise<void> {
  // Revert status default
  await knex.raw(`ALTER TABLE visits ALTER COLUMN status SET DEFAULT 'in_progress'`);

  // Remove nurse_id column
  await knex.schema.alterTable('visits', (table) => {
    table.dropColumn('nurse_id');
  });

  // NOTE: PostgreSQL does not support removing enum values directly.
  // To fully revert, the enum type would need to be recreated — omitted for safety.
}
