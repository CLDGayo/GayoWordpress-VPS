import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
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
await page.goto('http://localhost:8085/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

// Scroll to portfolio section
await page.evaluate(() => {
  document.getElementById('portfolio')?.scrollIntoView({ behavior: 'instant' });
});
await new Promise(r => setTimeout(r, 1500));

// Click GoHighLevel platform card
await page.evaluate(() => {
  const elements = document.querySelectorAll('h3');
  for (const el of elements) {
    if (el.textContent?.trim() === 'GoHighLevel') {
      el.closest('[class*="liquid-glass"]')?.click();
      break;
    }
  }
});
await new Promise(r => setTimeout(r, 1500));

await page.screenshot({ path: join(outDir, 'screenshot-98-ghl-platform-modal.jpg'), type: 'jpeg', quality: 85 });

// Click the GHL project card inside the modal
await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="cursor-pointer"]');
  for (const card of cards) {
    if (card.textContent?.includes('GoHighLevel CRM')) {
      card.click();
      break;
    }
  }
});
await new Promise(r => setTimeout(r, 1500));

await page.screenshot({ path: join(outDir, 'screenshot-99-ghl-case-study.jpg'), type: 'jpeg', quality: 85 });

await browser.close();
console.log('Screenshots saved');
