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
await new Promise(r => setTimeout(r, 1500));

// Enter special section
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const chip = btns.find(b => b.textContent?.includes('Me'));
  if (chip) chip.click();
});
await new Promise(r => setTimeout(r, 1500));

// Toggle to light mode using the sun/moon button in the header
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  // The theme toggle is in the header - look for title "Switch to light"
  const toggle = btns.find(b => b.getAttribute('title')?.includes('light'));
  if (toggle) { toggle.click(); return 'toggled'; }
  return 'not found';
});
await new Promise(r => setTimeout(r, 1500));

const existing = readdirSync(outDir).filter(f => f.match(/\.(png|jpg)$/)).length;
const filepath = join(outDir, `screenshot-${existing + 1}-light-mode.jpg`);
await page.screenshot({ path: filepath, type: 'jpeg', quality: 85 });
await browser.close();
console.log(`Saved: screenshot-${existing + 1}-light-mode.jpg`);
