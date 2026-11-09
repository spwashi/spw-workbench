import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    // Seed tests sit beside the source they exercise. The kernel is portable:
    // no test here may import runtime, CLI, LSP or scripts/.
    include: ['packages/spw-seed/src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
