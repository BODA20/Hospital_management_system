import db from '../src/config/db';
import { clearAllUserCache } from '../src/common/utils/userCache';

// Setup before running tests
beforeAll(async () => {
  console.log('Starting setup for tests...');
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  clearAllUserCache();
});

afterAll(async () => {
  console.log('Cleaning up after tests...');
  await db.destroy();
});
