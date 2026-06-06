import { Knex } from 'knex';
import { seed as seedUsers } from './users.seed';
import { seed as seedAdmin } from './admin.seed';
import logger from '../common/utils/logger';

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