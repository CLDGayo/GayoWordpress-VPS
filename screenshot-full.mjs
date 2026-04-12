import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'temporary screenshots');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

const existing = existsSync(outDir)
  ? readdirSync(outDir).filter(f => f.match(/\.(png|jpg)$/)).length
  : 0;
const filename = `screenshot-${existing + 1}${label}.jpg`;
const filepath = join(outDir, filename);

const browser = await puppeteer.launch({
  executablePath: executablePath(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1500));

// Force all reveal elements to become visible
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  document.querySelectorAll('.skill-bar-fill').forEach(el => {
    const w = parseFloat(el.dataset.w || 0);
    el.style.width = (w * 100) + '%';
    el.classList.add('in');
  });
});
await new Promise(r => setTimeout(r, 800));

await page.screenshot({ path: filepath, fullPage: true, type: 'jpeg', quality: 85 });
await browser.close();
console.log(`Saved: temporary screenshots/${filename}`);
