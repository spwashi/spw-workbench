import { defineConfig } from 'vitest/config'
import { vitestWorkspaceAlias } from './vitest.aliases'

export default defineConfig({
  resolve: {
    alias: vitestWorkspaceAlias,
  },
  test: {
    // Runtime suite lives under src/runtime (imports packages/spw-runtime).
    // Package-local tests are included when they land under packages/spw-runtime.
    include: [
      'src/runtime/**/*.test.ts',
      'packages/spw-runtime/src/**/*.test.ts',
    ],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
