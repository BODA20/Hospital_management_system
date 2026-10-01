import knex, { Knex } from 'knex';
import 'dotenv/config';
// ─── Startup Env Validation ────────────────────────────────────────────────────
// Fail loudly at boot time instead of silently using wrong credentials.
const requiredDbEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;
for (const key of requiredDbEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Raw DB row shape — matches actual column names in the database
interface UsersDbRow {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active?: boolean;
  refresh_token?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

declare module 'knex/types/tables' {
  interface Tables {
    users: Knex.CompositeTableType<
      UsersDbRow,
      Omit<UsersDbRow, 'id' | 'created_at' | 'updated_at'>,
      Partial<Omit<UsersDbRow, 'id' | 'created_at' | 'updated_at'>>
    >;
  }
}

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

const db = knex(config);

export default db;

