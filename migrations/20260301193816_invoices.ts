import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invoices', (table) => {
    table.increments('id').primary();

    table.string('invoice_no', 30).notNullable().unique();

    table
      .integer('patient_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('patients')
      .onDelete('RESTRICT');

    table
      .integer('visit_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('visits')
      .onDelete('SET NULL');

    table
      .enu('status', ['draft', 'issued', 'partially_paid', 'paid', 'void'], {
        useNative: true,
        enumName: 'invoice_status',
      })
      .notNullable()
      .defaultTo('draft');

    table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    table.decimal('discount', 12, 2).notNullable().defaultTo(0);
    table.decimal('tax', 12, 2).notNullable().defaultTo(0);
    table.decimal('total', 12, 2).notNullable().defaultTo(0);

    table.decimal('paid_amount', 12, 2).notNullable().defaultTo(0);
    table.decimal('due_amount', 12, 2).notNullable().defaultTo(0);

    table.timestamp('issued_at', { useTz: true }).nullable();
    table.timestamp('due_at', { useTz: true }).nullable();

    table
      .integer('created_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['patient_id', 'created_at']);
    table.index(['visit_id']);
    table.index(['status', 'created_at']);
  });

  await knex.raw(`
    ALTER TABLE invoices
    ADD CONSTRAINT invoice_amounts_non_negative
    CHECK (
      subtotal >= 0 AND discount >= 0 AND tax >= 0 AND total >= 0
      AND paid_amount >= 0 AND due_amount >= 0
    );
  `);

  await knex.raw(`
    ALTER TABLE invoices
    ADD CONSTRAINT invoice_total_consistency
    CHECK (total = (subtotal - discount + tax));
  `);

  await knex.raw(`
    ALTER TABLE invoices
    ADD CONSTRAINT invoice_due_consistency
    CHECK (due_amount = (total - paid_amount));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoices');
  await knex.raw(`DROP TYPE IF EXISTS invoice_status;`);
}
