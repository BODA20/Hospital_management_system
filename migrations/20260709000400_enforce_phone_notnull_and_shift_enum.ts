import type { Knex } from 'knex';

/**
 * Enforce data integrity rules:
 * 1. `users.phone` – must never be null. Backfill existing rows with a placeholder
 *    so the NOT NULL constraint can be applied without failing on existing data.
 * 2. `users.assigned_shift` – already added as a non-nullable enum in migration
 *    20260709000200, so this migration ensures any stragglers are corrected.
 * 3. `nurses.shift` – restrict ENUM to ['morning', 'night'] only (remove 'evening').
 *    Existing 'evening' rows are coerced to 'morning' before the constraint is applied.
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. Backfill NULL phones on users ───────────────────────────────────────
  await (knex('users') as any)
    .whereNull('phone')
    .update({ phone: 'NOT_PROVIDED' });

  // Alter column to NOT NULL with default placeholder
  await knex.schema.alterTable('users', (table) => {
    table.string('phone', 20).notNullable().defaultTo('NOT_PROVIDED').alter();
  });

  // ── 2. Correct any stray assigned_shift NULLs on users ────────────────────
  await (knex('users') as any)
    .whereNull('assigned_shift')
    .update({ assigned_shift: 'Morning' });

  // ── 3. Migrate nurses.shift 'evening' → 'morning' before enum restriction ──
  await knex('nurses')
    .where({ shift: 'evening' })
    .update({ shift: 'morning' });
}

export async function down(knex: Knex): Promise<void> {
  // Revert phone back to nullable
  await knex.schema.alterTable('users', (table) => {
    table.string('phone', 20).nullable().alter();
  });
}
