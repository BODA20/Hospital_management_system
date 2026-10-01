import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('staff_applications', (table) => {
    table
      .enu('requested_shift', ['Morning', 'Night'], {
        useNative: true,
        enumName: 'requested_shift_app',
      })
      .notNullable()
      .defaultTo('Morning');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('staff_applications', (table) => {
    table.dropColumn('requested_shift');
  });
  await knex.raw('DROP TYPE IF EXISTS requested_shift_app');
}
