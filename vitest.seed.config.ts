import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    // Legacy re-export tree + package-local tests (math, form-sequence, …)
    include: [
      'src/seed/**/*.test.ts',
      'packages/spw-seed/src/**/*.test.ts',
    ],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
