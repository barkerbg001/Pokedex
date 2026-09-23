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
  },
});

