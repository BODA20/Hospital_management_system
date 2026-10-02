import db from '../src/config/db';

jest.mock('../src/config/redis', () => {
  const mRedisClient = {
    connect: jest.fn().mockImplementation(async () => undefined),
    on: jest.fn(),
    quit: jest.fn().mockImplementation(async () => undefined),
    set: jest.fn().mockImplementation(async () => 'OK'),
    get: jest.fn().mockImplementation(async () => null),
    del: jest.fn().mockImplementation(async () => 1),
    exists: jest.fn().mockImplementation(async () => 0),
    isOpen: true,
    isReady: true,
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
});

afterAll(async () => {
  // Global teardown if needed
});
