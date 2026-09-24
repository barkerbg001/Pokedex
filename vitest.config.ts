import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // This project keeps JSX in .js files; like vite.config.js, both the React
  // plugin and esbuild need telling, or no component can be imported in tests
  plugins: [react({ include: /\.jsx?$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // Mounting Pokedex renders the whole app tree with several concurrent
    // fetches; the default 5000ms is occasionally too tight once enough test
    // files are running in parallel and competing for CPU
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: ['src/**/*.test.js', 'src/setupTests.js', 'src/index.js'],
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
