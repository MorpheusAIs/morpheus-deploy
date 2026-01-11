import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@morpheus-deploy/contracts': path.resolve(__dirname, './packages/contracts/src'),
      '@morpheus-deploy/core': path.resolve(__dirname, './packages/core/src'),
      '@morpheus-deploy/adapters': path.resolve(__dirname, './packages/adapters/src'),
      '@morpheus-deploy/templates': path.resolve(__dirname, './packages/templates/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      '**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.test.ts',  // Unit tests with forked Base Sepolia
      'packages/**/tests/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/integration/**',  // Exclude integration tests (use vitest.integration.config.ts)
    ],
    setupFiles: ['./tests/setup/fork.ts'],  // Fork setup before all tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/tests/**',
        '**/__mocks__/**',
      ],
    },
    testTimeout: 30000,  // 30s for fork tests
    hookTimeout: 30000,  // 30s for setup/teardown
  },
});
