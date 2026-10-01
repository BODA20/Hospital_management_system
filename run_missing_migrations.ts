import knex from 'knex';
import config from './knexfile';
import fs from 'fs';
import path from 'path';
const db = knex(config.development);

async function runMissing() {
  console.log('Starting missing migrations...');
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.ts')).sort();
  
  // Find specific missing migrations
  const missingFiles = files.filter(f => f.includes('20260428203500') || f.includes('20260709000400'));
  
  for (const file of missingFiles) {
    console.log(`Running ${file}...`);
    try {
      const module = await import(path.join(migrationsDir, file));
      if (module.up) {
        await module.up(db);
        console.log(`Success: ${file}`);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate key') || err.message.includes('Duplicate column'))) {
        console.log(`Skipped (already exists): ${file}`);
      } else {
        console.error(`Error running ${file}:`, err);
      }
    }
  }
  
  console.log('Finished missing migrations.');
  process.exit(0);
}

runMissing().catch(err => {
  console.error(err);
  process.exit(1);
});
