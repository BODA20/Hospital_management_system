import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doctors', (table) => {
    // specialization exists but is NOT NULL, let's make it NULL
    table.string('specialization', 100).nullable().alter();
    
    // Add missing bio field
    table.text('bio').nullable();
    
    // Make department_id nullable
    table.integer('department_id').unsigned().nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doctors', (table) => {
    table.dropColumn('specialization');
    table.dropColumn('bio');
    table.integer('department_id').unsigned().notNullable().alter();
  });
}
