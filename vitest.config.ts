import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Mounting Pokedex renders the whole app tree with several concurrent
    // fetches; the default 5000ms is occasionally too tight once enough test
    // files are running in parallel and competing for CPU
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/setupTests.ts', 'src/index.tsx', 'src/vite-env.d.ts', 'src/types/**'],
      // A floor, not a target: set a little under current coverage (as of
      // 2026-09-24: ~80% lines/statements, ~81% functions, ~67% branches) so
      // the suite fails if it regresses, not because it's not yet at 100%.
      // Raise these as more of the app gets covered - see TODO.md.
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 78,
        branches: 62,
      },
    },
  },
});
