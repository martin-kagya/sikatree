import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
    env: {
      // Integration tests run against a throwaway database, never the dev one.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/sikatree_test',
      ADMIN_PASSWORD: 'test-password',
      RESERVATION_DAYS: '30',
      AUTH_SECRET: 'test-auth-secret',
      CRON_SECRET: 'test-cron-secret',
    },
  },
});
