import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'temporary screenshots');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: executablePath(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));

// Click the first chip (rounded pill buttons in the AskMeAnything section)
const clicked = await page.evaluate(() => {
  // Find buttons with rounded-full / pill style that contain chip text
  const btns = Array.from(document.querySelectorAll('button'));
  const chip = btns.find(b => b.textContent?.includes('Me') || b.textContent?.includes('Projects'));
  if (chip) { chip.click(); return true; }
  return false;
});
console.log('Clicked chip:', clicked);

await new Promise(r => setTimeout(r, 2500));

const existing = readdirSync(outDir).filter(f => f.match(/\.(png|jpg)$/)).length;
const filepath = join(outDir, `screenshot-${existing + 1}-special.jpg`);
await page.screenshot({ path: filepath, fullPage: false, type: 'jpeg', quality: 85 });
await browser.close();
console.log(`Saved: temporary screenshots/screenshot-${existing + 1}-special.jpg`);
