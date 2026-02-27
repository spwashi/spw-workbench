import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/runtime/**/*.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
