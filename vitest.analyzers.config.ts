import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    // Analyzer tests sit beside their script (spw-flow-scan.test.ts); __tests__ holds the older layout.
    include: ['scripts/analyzers/**/*.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
