import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

/**
 * Headless (node) + DOM harness tests under src/testing.
 * DOM fixture specs match jsdom; all other testing helpers run on node.
 */
export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    include: ['src/testing/**/*.test.ts'],
    // DOM fixture suite stays on vitest.dom (jsdom only).
    exclude: ['src/testing/**/dom-css-harness.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
