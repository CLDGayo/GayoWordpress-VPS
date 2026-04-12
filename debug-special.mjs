import puppeteer from 'puppeteer-core';
import { executablePath } from 'puppeteer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({
  executablePath: executablePath(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleLogs = [];
page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => consoleLogs.push(`[ERROR] ${err.message}`));

await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));

// Click chip to enter special section
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const chip = btns.find(b => b.textContent?.includes('Me'));
  if (chip) chip.click();
});

await new Promise(r => setTimeout(r, 2000));

// Get WebGL info and canvas details
const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas[style*="pointer-events: none"]') || document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  const style = window.getComputedStyle(canvas);
  const rect = canvas.getBoundingClientRect();
  
  // Check WebGL context
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  return {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    background: style.background,
    display: style.display,
    position: style.position,
    zIndex: style.zIndex,
    hasWebGL: !!gl,
    webglType: gl ? gl.constructor.name : 'none',
    parentBg: canvas.parentElement ? window.getComputedStyle(canvas.parentElement).background : 'N/A',
    sectionBg: (() => {
      // Find the fixed overlay div
      const fixed = document.querySelector('[style*="position: fixed"][style*="z-index: 200"]') ||
                    document.querySelector('[style*="position:fixed"]');
      return fixed ? window.getComputedStyle(fixed).background : 'not found';
    })(),
    isDarkClass: document.documentElement.classList.contains('dark'),
  };
});

console.log('=== Canvas Info ===');
console.log(JSON.stringify(info, null, 2));
console.log('\n=== Console Logs ===');
consoleLogs.forEach(l => console.log(l));

await browser.close();
