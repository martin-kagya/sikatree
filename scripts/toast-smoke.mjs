import { chromium } from 'playwright-core';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const path = process.env.TOAST_SMOKE_PATH ?? '/';
const storageState = process.env.TOAST_SMOKE_STORAGE;
const trigger = process.env.TOAST_SMOKE_TRIGGER;
const url = new URL(path, base).toString();

const browser = await chromium.launch({ channel: 'chrome' });
let failed = false;

for (const width of [360, 390, 480]) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, storageState });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const viewport = document.getElementById('toast-viewport');
    if (!viewport) return { error: 'missing #toast-viewport' };
    const style = getComputedStyle(viewport);
    const rect = viewport.getBoundingClientRect();
    const anchor = document.querySelector('[data-toast-anchor]');
    return {
      position: style.position,
      zIndex: style.zIndex,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
      parent: viewport.parentElement?.tagName,
      anchorBottom: anchor ? anchor.getBoundingClientRect().bottom : null,
    };
  });

  const issues = [];
  if (result.error) issues.push(result.error);
  if (result.position !== 'fixed') issues.push(`position ${result.position}`);
  if (result.zIndex !== '200') issues.push(`z-index ${result.zIndex}`);
  if (result.parent !== 'BODY') issues.push(`parent ${result.parent}`);
  if (result.top < 56) issues.push(`top ${result.top}`);
  if (width < 480 && (Math.round(result.left) !== 12 || Math.round(result.width) !== width - 24)) {
    issues.push(`mobile box ${result.left}/${result.width}`);
  }
  if (width >= 480 && (Math.round(result.width) !== 420 || Math.round(result.left) !== (width - 420) / 2)) {
    issues.push(`wide box ${result.left}/${result.width}`);
  }
  if (result.anchorBottom !== null && result.top < result.anchorBottom + 7) {
    issues.push(`top ${result.top} vs anchor ${result.anchorBottom}`);
  }

  if (issues.length) {
    failed = true;
    console.error(`FAIL ${width}px: ${issues.join(', ')}`);
  } else {
    console.log(`ok ${width}px: fixed at ${result.left},${result.top}, ${result.width}px wide`);
  }

  if (trigger && width === 360) {
    await page.locator(trigger).first().click();
    await page.waitForSelector('#toast-viewport [role=status], #toast-viewport [role=alert]', {
      timeout: 5000,
    });
    await page.waitForTimeout(220);
    const toast = page.locator('#toast-viewport [role=status], #toast-viewport [role=alert]').first();
    const card = await toast.boundingBox();
    const anchor = await page
      .locator('[data-toast-anchor]')
      .first()
      .boundingBox()
      .catch(() => null);
    const toastIssues = [];
    if (!card) toastIssues.push('toast has no box');
    if (card && (card.x < 12 || card.x + card.width > width - 11)) {
      toastIssues.push(`toast width ${card.x}/${card.width}`);
    }
    if (card && anchor && card.y < anchor.y + anchor.height + 7) {
      toastIssues.push(`toast top ${card.y} vs header ${anchor.y + anchor.height}`);
    }
    if ((await page.locator('#toast-viewport [role=status], #toast-viewport [role=alert]').count()) !== 1) {
      toastIssues.push('more than one toast');
    }
    if (toastIssues.length) {
      failed = true;
      console.error(`FAIL toast ${width}px: ${toastIssues.join(', ')}`);
    } else if (card) {
      console.log(`ok toast ${width}px: ${Math.round(card.x)},${Math.round(card.y)} ${Math.round(card.width)}px wide`);
    }
  }

  await context.close();
}

await browser.close();
if (failed) process.exit(1);
