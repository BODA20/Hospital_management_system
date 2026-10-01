import type { Knex } from 'knex';

/**
 * Add 'receptionist' to the PostgreSQL native enum type 'requested_role_app'.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TYPE requested_role_app ADD VALUE IF NOT EXISTS 'receptionist';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // PostgreSQL does not support removing enum values cleanly without recreating the type,
  // so down is left as a no-op to avoid breaking existing data.
}
