import db from '../src/config/db';
import { clearAllUserCache } from '../src/common/utils/userCache';

jest.mock('../src/config/redis', () => {
  const mRedisClient = {
    connect: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    set: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(0),
    isOpen: true,
  };
  return {
    __esModule: true,
    default: mRedisClient,
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
  };
});

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
