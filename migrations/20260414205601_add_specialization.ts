import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doctors', (table) => {
    table.string('specialization', 100).nullable();
    table.text('bio').nullable();
    table.integer('listen_number').nullable();

    table.integer('department_id').unsigned().nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doctors', (table) => {
    table.dropColumn('specialization');
    table.dropColumn('bio');
    table.dropColumn('listen_number');

     table.integer('department_id').unsigned().notNullable().alter();
  });
}