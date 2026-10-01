import type { Knex } from 'knex';

// Valid action types for the security audit log system
const ACTION_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'USER_BANNED',
  'USER_UNBANNED',
  'ROLE_CHANGED',
  'LEAVE_REQUEST_SUBMITTED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'ACCOUNT_CREATED',
] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('security_logs', (table) => {
    table.increments('id').primary();

    // Nullable FK — unauthenticated events (e.g. failed logins) have no user_id
    table
      .integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Snapshot of actor identity at log time — persists even if user is deleted
    table.string('actor_name', 255).notNullable().defaultTo('system');

    // Strict enum for action classification
    table
      .enu('action_type', ACTION_TYPES, {
        useNative: false,          // store as varchar, not a PG enum, for easy migration
        enumName: 'security_log_action',
      })
      .notNullable();

    // Human-readable description of the event
    table.text('description').notNullable();

    // Client IP at time of request (may be null for programmatic/internal events)
    table.string('ip_address', 64).nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
  });

  // Index for fast admin queries — ordered by most recent first
  await knex.schema.raw(
    'CREATE INDEX idx_security_logs_created_at ON security_logs (created_at DESC)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_security_logs_user_id ON security_logs (user_id)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_security_logs_action_type ON security_logs (action_type)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('security_logs');
}
