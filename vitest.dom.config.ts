import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    // DOM-only fixtures. Headless harness tests use vitest.testing.config.ts (node).
    include: ['src/testing/**/dom-css-harness.test.ts'],
    environment: 'jsdom',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
