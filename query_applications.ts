import knex from 'knex';
import config from './knexfile';
const db = knex(config.development);

async function check() {
  const apps = await db('staff_applications').select('*');
  console.log(apps);
  process.exit(0);
}

check();
