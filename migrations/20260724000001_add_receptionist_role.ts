import type { Knex } from 'knex';

/**
 * Add 'receptionist' as an authorised role value.
 *
 * The users.role column is stored as VARCHAR (not a native PG ENUM type),
 * so we add/remove a CHECK constraint rather than ALTER TYPE … ADD VALUE.
 *
 * The old constraint (if any) is dropped first so we can widen the allowed set.
 */
export async function up(knex: Knex): Promise<void> {
  // Drop the old role check constraint if it exists (name may vary per project)
  await knex.raw(`
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check
  `);

  // Re-add the constraint with 'receptionist' included
  await knex.raw(`
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'doctor', 'nurse', 'patient', 'receptionist'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Revert to the original constraint (without receptionist)
  await knex.raw(`
    ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check
  `);

  await knex.raw(`
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'doctor', 'nurse', 'patient'))
  `);
}
