import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('patients', (table) => {
    table.string('phone', 30).nullable().unique();

    table
      .enu('gender', ['male', 'female', 'other'], {
        useNative: true,
        enumName: 'patient_gender',
      })
      .nullable();

    table
      .enu(
        'blood_group',
        ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        { useNative: true, enumName: 'blood_group_type' },
      )
      .nullable();

    table.string('emergency_contact', 30).nullable();

    // updated_at for partial updates
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['phone']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('patients', (table) => {
    table.dropColumn('phone');
    table.dropColumn('gender');
    table.dropColumn('blood_group');
    table.dropColumn('emergency_contact');
    table.dropColumn('updated_at');
  });
  await knex.raw(`DROP TYPE IF EXISTS patient_gender;`);
  await knex.raw(`DROP TYPE IF EXISTS blood_group_type;`);
}
