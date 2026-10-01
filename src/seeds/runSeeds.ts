import { Knex } from 'knex';
import { seed as seedUsers } from './users.seed';
import { seed as seedAdmin } from './admin.seed';
import logger from '../common/utils/logger';
import db from '../config/db';

export async function seed(knex: Knex): Promise<void> {
  try {
    logger.info('info: 🔄 Starting Comprehensive Database Reset...');
    await seedUsers();
    await seedAdmin();
    logger.info('Database seeded successfully! 🎉');
  } catch (error) {
    logger.error('Seed execution failed ❌', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

if (require.main === module) {
  seed(db)
    .then(() => {
      logger.info('Seed process completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed process failed:', err);
      process.exit(1);
    });
}