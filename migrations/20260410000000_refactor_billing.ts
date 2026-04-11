import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add consultation_fee to doctors if it doesn't exist
  const hasConsultationFee = await knex.schema.hasColumn('doctors', 'consultation_fee');
  if (!hasConsultationFee) {
    await knex.schema.alterTable('doctors', (table) => {
      table.decimal('consultation_fee', 12, 2).notNullable().defaultTo(0);
    });
  }

  // 2. Drop existing legacy tables
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.raw('DROP TYPE IF EXISTS invoice_status CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS invoice_item_type CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS payment_method CASCADE;');

  // 3. Create strictly compliant invoices table
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

    table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    table.decimal('discount', 12, 2).notNullable().defaultTo(0);
    table.decimal('tax', 12, 2).notNullable().defaultTo(0);
    table.decimal('final_amount', 12, 2).notNullable().defaultTo(0);

    table.enu('status', ['pending', 'paid', 'cancelled'], {
      useNative: true,
      enumName: 'invoice_status_enum',
    }).notNullable().defaultTo('pending');

    table.enu('payment_method', ['cash', 'card'], {
      useNative: true,
      enumName: 'payment_method_enum',
    }).nullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['patient_id']);
    table.index(['visit_id']);
    table.index(['status']);
  });

  // 4. Constraints for invoices
  await knex.raw(`
    ALTER TABLE invoices
    ADD CONSTRAINT check_invoice_amounts_positive
    CHECK (total_amount >= 0 AND discount >= 0 AND tax >= 0 AND final_amount >= 0);
  `);

  await knex.raw(`
    ALTER TABLE invoices
    ADD CONSTRAINT check_invoice_final_amount_calc
    CHECK (final_amount = (total_amount - discount + tax));
  `);

  // 5. Create compliant invoice_items table
  await knex.schema.createTable('invoice_items', (table) => {
    table.increments('id').primary();

    table
      .integer('invoice_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('invoices')
      .onDelete('CASCADE');

    table.string('description', 255).notNullable();
    table.integer('quantity').notNullable().defaultTo(1);
    table.decimal('unit_price', 12, 2).notNullable().defaultTo(0);
    table.decimal('line_total', 12, 2).notNullable().defaultTo(0);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 6. Constraints for invoice_items
  await knex.raw(`
    ALTER TABLE invoice_items
    ADD CONSTRAINT check_invoice_item_amounts_positive
    CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0);
  `);

  await knex.raw(`
    ALTER TABLE invoice_items
    ADD CONSTRAINT check_invoice_item_calc
    CHECK (line_total = (quantity * unit_price));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.raw('DROP TYPE IF EXISTS invoice_status_enum CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS payment_method_enum CASCADE;');

  const hasConsultationFee = await knex.schema.hasColumn('doctors', 'consultation_fee');
  if (hasConsultationFee) {
    await knex.schema.alterTable('doctors', (table) => {
      table.dropColumn('consultation_fee');
    });
  }
}
