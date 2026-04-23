import type { Config } from 'jest';

/**
 * Jest Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses tsconfig.test.json which:
 *   • Switches module → CommonJS  (avoids nodenext/ESM issues at test runtime)
 *   • Injects types: ["jest", "node"]  (fixes all IDE 'Cannot find jest' errors)
 * ─────────────────────────────────────────────────────────────────────────────
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.spec.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
      },
    ],
  },

  clearMocks: true,
  verbose: true,
};

export default config;
