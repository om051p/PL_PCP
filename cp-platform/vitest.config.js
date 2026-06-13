import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    // Default to node; component tests opt in to jsdom via `// @vitest-environment jsdom`
    environment: 'node',
    setupFiles: ['./src/test-utils/setupTests.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/e2e/**',
        'src/test-utils/**',
        'src/main.jsx',
      ],
      thresholds: {
        statements: 30,
        branches: 20,
        functions: 25,
        lines: 30,
      },
    },
  },
})
