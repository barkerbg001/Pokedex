import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SW_FILE = 'sw.js';
const BUILD_HASH_PLACEHOLDER = '__BUILD_HASH__';
const BUILD_ASSETS_PLACEHOLDER = '/* __BUILD_ASSETS__ */ []';
// Build output folders whose files get precached, on top of the static app
// shell list in sw.js: Vite's hashed bundles and the type filter icons
const PRECACHE_DIRS = ['assets', 'types'];

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

// Fill in the built service worker from the build output:
// - CACHE_NAME gets a hash of every other built file, so a deploy that changes
//   anything invalidates the old cache without a manual version bump.
// - The precache list gets Vite's hashed JS/CSS bundles (plus type icons), so
//   the app shell works offline right after the service worker installs.
function swBuildManifest() {
  let outDir: string;
  return {
    name: 'sw-build-manifest',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = join(outDir, SW_FILE);
      const files = listFiles(outDir)
        .filter((file) => file !== swPath)
        .sort();

      const hash = createHash('sha256');
      files.forEach((file) => {
        hash.update(relative(outDir, file));
        hash.update(readFileSync(file));
      });
      const version = hash.digest('hex').slice(0, 12);

      const precacheUrls = files
        .map((file) => relative(outDir, file).split(sep).join('/'))
        .filter((path) => PRECACHE_DIRS.includes(path.split('/')[0]!))
        .map((path) => `/${path}`);

      let source = readFileSync(swPath, 'utf8');
      for (const placeholder of [BUILD_HASH_PLACEHOLDER, BUILD_ASSETS_PLACEHOLDER]) {
        if (!source.includes(placeholder)) {
          throw new Error(`${SW_FILE} is missing the ${placeholder} placeholder`);
        }
      }
      source = source
        .replaceAll(BUILD_HASH_PLACEHOLDER, version)
        .replace(BUILD_ASSETS_PLACEHOLDER, JSON.stringify(precacheUrls));
      writeFileSync(swPath, source);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), swBuildManifest()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  publicDir: 'public',
});
