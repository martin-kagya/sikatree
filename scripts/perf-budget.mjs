#!/usr/bin/env node
// Performance budget for the landing page (LP-04). Boots the production build,
// loads it in Chrome as a mid-range Android on throttled 4G, and fails when the
// measured numbers break the budget.
//
// Usage:
//   pnpm build && pnpm budget
//   PERF_URL=https://preview.example pnpm budget   # against a deployed URL
//
// Thresholds can be overridden with BUDGET_JS_KB, BUDGET_CSS_KB,
// BUDGET_IMAGE_KB and BUDGET_LCP_MS.

import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = Number(process.env.PERF_PORT ?? 3210);
const BASE = (process.env.PERF_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const budgets = {
  jsKb: Number(process.env.BUDGET_JS_KB ?? 130),
  cssKb: Number(process.env.BUDGET_CSS_KB ?? 40),
  imageKb: Number(process.env.BUDGET_IMAGE_KB ?? 900),
  lcpMs: Number(process.env.BUDGET_LCP_MS ?? 2500),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(BASE, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error(`server at ${BASE} did not become ready`);
}

function startServer() {
  if (process.env.PERF_URL) return null;
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)],
    { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, NODE_ENV: 'production' } },
  );
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`next start exited with ${code}`);
  });
  return child;
}

function summarise(entries) {
  const totals = { js: 0, css: 0, image: 0, font: 0, other: 0 };
  const images = [];

  for (const entry of entries) {
    const url = entry.name;
    if (!/^https?:/.test(url)) continue;
    const bytes = entry.bytes || 0;

    if (/\.js(\?|$)/.test(url)) totals.js += bytes;
    else if (/\.css(\?|$)/.test(url)) totals.css += bytes;
    else if (/_next\/image/.test(url) || /\.(avif|webp|jpe?g|png|gif|svg)(\?|$)/i.test(url)) {
      totals.image += bytes;
      images.push({ url, bytes });
    } else if (/\.(woff2?|ttf|otf)(\?|$)/.test(url)) totals.font += bytes;
    else totals.other += bytes;
  }

  return { totals, images };
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

function row(label, value, budget, unit = 'kB') {
  const failed = value > budget;
  const shown = unit === 'kB' ? `${value.toFixed(1)} kB` : `${value.toFixed(0)} ms`;
  console.log(
    `${failed ? 'FAIL' : ' ok '}  ${label.padEnd(18)} ${shown.padStart(12)}  budget ${budget} ${unit}`,
  );
  return failed;
}

async function main() {
  const server = startServer();
  let browser;

  try {
    await waitForServer();

    const launchOptions = { headless: true, args: process.env.CI ? ['--no-sandbox'] : [] };
    try {
      browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
    } catch {
      browser = await chromium.launch(launchOptions);
    }

    const device = {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Mobile Safari/537.36',
    };

    async function run({ scroll, throttle = true }) {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      if (throttle) {
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
          uploadThroughput: Math.round((750 * 1024) / 8),
        });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      }

      await page.addInitScript(() => {
        window.__lcp = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__lcp = Math.max(window.__lcp, entry.startTime);
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        window.__resources = () =>
          performance.getEntriesByType('resource').map((entry) => ({
            name: entry.name,
            bytes: entry.transferSize || 0,
          }));
      });

      await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(2500);

      const lcp = await page.evaluate(() => window.__lcp || 0);
      const firstView = summarise(await page.evaluate(() => window.__resources()));

      if (scroll) {
        await page.evaluate(async () => {
          await new Promise((resolve) => {
            let y = 0;
            const step = () => {
              y += 500;
              window.scrollTo(0, y);
              if (y < document.body.scrollHeight) setTimeout(step, 100);
              else resolve();
            };
            step();
          });
        });
        await page.waitForTimeout(2500);
      }

      const fullPage = summarise(await page.evaluate(() => window.__resources()));
      await context.close();
      return { lcp, firstView, fullPage };
    }

    // One unthrottled pass warms the server and the font cache; LCP is then the
    // median of three throttled runs, because a single sample is noisy.
    await run({ scroll: false, throttle: false });
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await run({ scroll: i === 0 }));

    const lcpValues = runs.map((r) => r.lcp).sort((a, b) => a - b);
    const lcp = lcpValues[1];
    const firstView = runs[1].firstView;
    const fullPage = runs[0].fullPage;


    console.log('\nMobile, 4x CPU throttle, Fast 3G (1.6 Mbps / 150 ms RTT), median of 3 runs\n');
    console.log(`LCP runs (ms): ${lcpValues.map((value) => value.toFixed(0)).join(', ')}\n`);
    let failed = false;
    failed = row('LCP', lcp, budgets.lcpMs, 'ms') || failed;
    failed = row('JS transfer', firstView.totals.js / 1024, budgets.jsKb) || failed;
    failed = row('CSS transfer', firstView.totals.css / 1024, budgets.cssKb) || failed;
    failed = row('Images (full page)', fullPage.totals.image / 1024, budgets.imageKb) || failed;

    console.log(
      `\nimages loaded: ${fullPage.images.length}, fonts: ${kb(fullPage.totals.font)}, other: ${kb(
        firstView.totals.other,
      )}`,
    );

    await browser.close();
    browser = null;

    if (failed) {
      console.error('\nPerformance budget failed.');
      process.exitCode = 1;
    } else {
      console.log('\nPerformance budget passed.');
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) {
      server.kill('SIGTERM');
      await sleep(300);
      if (!server.killed) server.kill('SIGKILL');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
