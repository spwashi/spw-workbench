import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    // Runtime tests sit beside the source they exercise.
    include: ['packages/spw-runtime/src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
