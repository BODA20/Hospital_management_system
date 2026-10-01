import { seed as seedUsers } from './users.seed';
import { seed as seedAdmin } from './admin.seed';
import logger from '../common/utils/logger';

async function main() {
  try {
    logger.info('🔄 Starting direct database seed...');
    await seedUsers();
    await seedAdmin();
    logger.info('Database seeded successfully! 🎉');
    process.exit(0);
  } catch (error) {
    logger.error('Seed execution failed ❌', { error });
    process.exit(1);
  }
}

main();
