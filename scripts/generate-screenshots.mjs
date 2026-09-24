/**
 * Capture the PWA install-dialog screenshots referenced in public/manifest.json.
 *
 * Writes:
 *   public/screenshots/narrow-browse.png  (390×844, form_factor: narrow)
 *   public/screenshots/wide-browse.png    (1280×800, form_factor: wide)
 *
 * Both show Browse on Generation I once the first Pokémon cards have loaded.
 *
 * Usage (from repo root):
 *   npm run screenshots
 *
 * Starts `vite` on an ephemeral port, captures, then shuts it down.
 * Override with SCREENSHOT_URL=http://localhost:3000 to shoot an already-
 * running server instead (the script won't start or stop one in that case).
 *
 * Requires Chromium for Playwright once:
 *   npx playwright install chromium
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'screenshots');
const VITE_BIN = join(
  ROOT,
  'node_modules',
  'vite',
  'bin',
  'vite.js'
);

/** Matches public/manifest.json `screenshots` entries. */
const SHOTS = [
  {
    file: 'narrow-browse.png',
    width: 390,
    height: 844,
    label: 'Browsing Generation I on a phone',
  },
  {
    file: 'wide-browse.png',
    width: 1280,
    height: 800,
    label: 'Browsing Generation I on desktop',
  },
];

const READY_TIMEOUT_MS = 90_000;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Could not allocate a free port'));
        return;
      }
      const { port } = addr;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

async function waitForUrl(url, timeoutMs) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} not ready: ${lastError?.message || lastError}`);
}

async function startDevServer() {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [VITE_BIN, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Don't spread process.env on Windows — undefined values make spawn throw EINVAL
    }
  );

  child.on('error', (err) => {
    throw err;
  });

  let stderr = '';
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const exitPromise = new Promise((_, reject) => {
    child.on('exit', (code) => {
      reject(new Error(`vite exited early (code ${code}): ${stderr.trim() || '(no stderr)'}`));
    });
  });

  try {
    await Promise.race([waitForUrl(url, READY_TIMEOUT_MS), exitPromise]);
  } catch (err) {
    child.kill('SIGTERM');
    throw err;
  }

  return {
    url,
    stop: () =>
      new Promise((resolve) => {
        if (child.killed) {
          resolve();
          return;
        }
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL');
          resolve();
        }, 2000);
      }),
  };
}

async function captureShot(browser, baseUrl, shot) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });

  // Force light theme before the app's first paint (matches App / index.html)
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pokedex-theme', 'light');
    } catch {
      // ignore
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(READY_TIMEOUT_MS);

  await page.goto(new URL('/?gen=generation-i', baseUrl).href, {
    waitUntil: 'domcontentloaded',
  });

  // Cards appear after the generation list + first species batch resolve
  await page.locator('.pokemon-card').first().waitFor({
    state: 'visible',
    timeout: READY_TIMEOUT_MS,
  });

  // Wait until sprite images have real pixels (visible alone isn't enough —
  // a broken/pending img still counts as visible and looks empty on phone)
  await page.waitForFunction(
    () => {
      const imgs = [...document.querySelectorAll('.pokemon-card img')];
      return imgs.length >= 6 && imgs.slice(0, 6).every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: READY_TIMEOUT_MS }
  );
  await page.waitForTimeout(300);

  const outPath = join(OUT_DIR, shot.file);
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`Wrote ${outPath} (${shot.width}×${shot.height}) — ${shot.label}`);
  await context.close();
}

async function capture(baseUrl) {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const shot of SHOTS) {
      await captureShot(browser, baseUrl, shot);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    await access(join(ROOT, 'node_modules', 'playwright'));
  } catch {
    throw new Error('playwright is not installed; run npm install');
  }

  const externalUrl = process.env.SCREENSHOT_URL;
  let stop = async () => {};
  let baseUrl = externalUrl;

  if (!baseUrl) {
    console.log('Starting Vite…');
    const server = await startDevServer();
    baseUrl = server.url;
    stop = server.stop;
    console.log(`Dev server ready at ${baseUrl}`);
  } else {
    console.log(`Using existing server at ${baseUrl}`);
    await waitForUrl(baseUrl, READY_TIMEOUT_MS);
  }

  try {
    await capture(baseUrl);
  } finally {
    await stop();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
