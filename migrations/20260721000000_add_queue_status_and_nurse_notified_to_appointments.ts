import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasQueueStatus = await knex.schema.hasColumn('appointments', 'queue_status');
  if (!hasQueueStatus) {
    await knex.schema.alterTable('appointments', (table) => {
      table.string('queue_status', 50).nullable().defaultTo('scheduled');
    });
  }

  const hasNurseNotified = await knex.schema.hasColumn('appointments', 'nurse_notified');
  if (!hasNurseNotified) {
    await knex.schema.alterTable('appointments', (table) => {
      table.boolean('nurse_notified').notNullable().defaultTo(false);
    });
  }

  const hasReminderSent = await knex.schema.hasColumn('appointments', 'reminder_email_sent');
  if (!hasReminderSent) {
    await knex.schema.alterTable('appointments', (table) => {
      table.boolean('reminder_email_sent').notNullable().defaultTo(false);
    });
  }

  // Add index for fast querying by status, date, queue_status, and nurse_notified
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_appointments_queue_worker
    ON appointments (status, nurse_notified, queue_status);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('appointments', (table) => {
    table.dropColumn('queue_status');
    table.dropColumn('nurse_notified');
    table.dropColumn('reminder_email_sent');
  });
}
