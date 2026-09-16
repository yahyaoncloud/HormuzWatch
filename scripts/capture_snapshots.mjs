import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.SNAPSHOT_URL || 'https://hormuzwatch.aburcloud.com';
const OUT_DIRS = [
  path.resolve(process.cwd(), 'client/public/assets/snapshots'),
  path.resolve(process.cwd(), 'assets/snapshots'),
];

for (const dir of OUT_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureSnapshots() {
  console.log(`[Snapshots] Launching browser to capture snapshots from ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High DPI / Retina clarity
  });
  const page = await context.newPage();

  const routes = [
    { name: 'tactical-map.png', url: `${BASE_URL}/?tab=map`, waitMs: 4000 },
    { name: 'intelligence-dashboard.png', url: `${BASE_URL}/?tab=intelligence`, waitMs: 3000 },
    { name: 'platform-documentation.png', url: `${BASE_URL}/?tab=docs`, waitMs: 2500 },
    { name: 'about-mission.png', url: `${BASE_URL}/?tab=about`, waitMs: 2500 },
  ];

  for (const route of routes) {
    console.log(`[Snapshots] Navigating to ${route.url}...`);
    try {
      await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(route.waitMs);

      for (const dir of OUT_DIRS) {
        const dest = path.join(dir, route.name);
        await page.screenshot({ path: dest, fullPage: false });
        console.log(`[Snapshots] Saved snapshot to ${dest}`);
      }
    } catch (err) {
      console.error(`[Snapshots] Error capturing ${route.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('[Snapshots] Finished capturing all snapshots successfully.');
}

captureSnapshots().catch(console.error);
