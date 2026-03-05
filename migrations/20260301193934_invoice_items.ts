import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invoice_items', (table) => {
    table.increments('id').primary();

    table
      .integer('invoice_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('invoices')
      .onDelete('CASCADE');

    table
      .enu('item_type', ['service', 'medication', 'lab', 'imaging', 'other'], {
        useNative: true,
        enumName: 'invoice_item_type',
      })
      .notNullable();

    table.string('description', 255).notNullable();

    table.decimal('quantity', 12, 2).notNullable().defaultTo(1);
    table.decimal('unit_price', 12, 2).notNullable().defaultTo(0);
    table.decimal('line_total', 12, 2).notNullable().defaultTo(0);

    table.integer('ref_table_id').unsigned().nullable();
    table.string('ref_table', 50).nullable();

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['invoice_id']);
    table.index(['item_type']);
  });

  await knex.raw(`
    ALTER TABLE invoice_items
    ADD CONSTRAINT invoice_item_amounts_non_negative
    CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0);
  `);

  await knex.raw(`
    ALTER TABLE invoice_items
    ADD CONSTRAINT invoice_item_total_consistency
    CHECK (line_total = (quantity * unit_price));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.raw(`DROP TYPE IF EXISTS invoice_item_type;`);
}
