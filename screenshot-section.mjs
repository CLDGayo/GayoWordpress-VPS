import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'temporary screenshots');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const url     = process.argv[2] || 'http://localhost:3000';
const section = process.argv[3] || '#hero'; // CSS selector to scroll to
const label   = process.argv[4] || 'section';

const existing = readdirSync(outDir).filter(f => f.match(/\.(png|jpg)$/)).length;
const filename = `screenshot-${existing + 1}-${label}.jpg`;
const filepath = join(outDir, filename);

const browser = await puppeteer.launch({
  executablePath: executablePath(),
  args: ['--no-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  document.querySelectorAll('.skill-bar-fill').forEach(el => {
    const w = parseFloat(el.dataset.w || 0);
    el.style.width = (w * 100) + '%';
    el.classList.add('in');
  });
});
await new Promise(r => setTimeout(r, 500));
await page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (el) el.scrollIntoView({ block: 'start' });
}, section);
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: filepath, fullPage: false, type: 'jpeg', quality: 85 });
await browser.close();
console.log(`Saved: temporary screenshots/${filename}`);
