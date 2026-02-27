import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/testing/**/*.test.ts'],
    environment: 'jsdom',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
  },
})
