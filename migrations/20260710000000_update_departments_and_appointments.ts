import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasDepartments = await knex.schema.hasTable('departments');
  if (hasDepartments) {
    const hasNameEn = await knex.schema.hasColumn('departments', 'name_en');
    if (!hasNameEn) {
      await knex.schema.alterTable('departments', (table) => {
        table.string('name_en').notNullable().defaultTo('Unknown EN');
        table.string('name_ar').notNullable().defaultTo('Unknown AR');
      });
    }
  } else {
    await knex.schema.createTable('departments', (table) => {
      table.increments('id').primary();
      table.string('name_en').notNullable();
      table.string('name_ar').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasDeptId = await knex.schema.hasColumn('users', 'department_id');
    if (!hasDeptId) {
      await knex.schema.alterTable('users', (table) => {
        table.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL');
      });
    }
  }

  const hasAppointments = await knex.schema.hasTable('appointments');
  if (hasAppointments) {
    const hasDeptId = await knex.schema.hasColumn('appointments', 'department_id');
    if (!hasDeptId) {
      await knex.schema.alterTable('appointments', (table) => {
        table.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasDeptId = await knex.schema.hasColumn('users', 'department_id');
    if (hasDeptId) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('department_id');
      });
    }
  }

  const hasAppointments = await knex.schema.hasTable('appointments');
  if (hasAppointments) {
    const hasDeptId = await knex.schema.hasColumn('appointments', 'department_id');
    if (hasDeptId) {
      await knex.schema.alterTable('appointments', (table) => {
        table.dropColumn('department_id');
      });
    }
  }

  const hasDepartments = await knex.schema.hasTable('departments');
  if (hasDepartments) {
    const hasNameEn = await knex.schema.hasColumn('departments', 'name_en');
    if (hasNameEn) {
      await knex.schema.alterTable('departments', (table) => {
        table.dropColumn('name_en');
        table.dropColumn('name_ar');
      });
    }
  }
}
