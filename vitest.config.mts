import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': import.meta.dirname } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/junit.xml' },
    coverage: { provider: 'v8', include: ['lib/reglas.ts', 'lib/esquemas.ts'], reporter: ['text', 'json-summary'] },
  },
})
