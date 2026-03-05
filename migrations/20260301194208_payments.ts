import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();

    table
      .integer('invoice_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('invoices')
      .onDelete('CASCADE');

    table.decimal('amount', 12, 2).notNullable();

    table
      .enu('method', ['cash', 'card', 'wallet', 'bank_transfer', 'insurance'], {
        useNative: true,
        enumName: 'payment_method',
      })
      .notNullable()
      .defaultTo('cash');

    table
      .timestamp('paid_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.string('reference', 100).nullable();

    table
      .integer('received_by')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(['invoice_id', 'paid_at']);
    table.index(['method', 'paid_at']);
  });

  await knex.raw(`
    ALTER TABLE payments
    ADD CONSTRAINT payment_amount_positive
    CHECK (amount > 0);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payments');
  await knex.raw(`DROP TYPE IF EXISTS payment_method;`);
}
