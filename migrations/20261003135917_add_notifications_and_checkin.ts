import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 100).notNullable();
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.string('entity_type', 50).nullable();
    table.integer('entity_id').unsigned().nullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at').nullable();
    table.timestamps(true, true);
  });

  // 2. Add 'checked_in' to appointment_status enum (requires executing outside transaction if modifying enum directly, but here we use DO block)
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_enum
          JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
         WHERE pg_type.typname = 'appointment_status'
           AND enumlabel = 'checked_in'
      ) THEN
        ALTER TYPE appointment_status ADD VALUE 'checked_in';
      END IF;
    END
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
  // Enum values cannot be removed in PostgreSQL without recreating the type
}

