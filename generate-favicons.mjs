import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const favicons = [
  {
    name: 'gwyneth-favicon',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; }
html, body { width: 64px; height: 64px; overflow: hidden; background: transparent; }
svg { display: block; }
</style>
</head>
<body>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6EAF"/>
      <stop offset="100%" stop-color="#FF3D8E"/>
    </linearGradient>
    <linearGradient id="letter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#FFD6EA"/>
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="0" y="0" width="64" height="64" rx="14" ry="14" fill="url(#bg)"/>
  <!-- Letter G centered -->
  <text
    x="33"
    y="47"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="44"
    font-weight="700"
    fill="url(#letter)"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="-1"
  >G</text>
</svg>
</body>
</html>`,
  },
  {
    name: 'clarence-favicon',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; }
html, body { width: 64px; height: 64px; overflow: hidden; background: transparent; }
svg { display: block; }
</style>
</head>
<body>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
    <linearGradient id="letter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#BAE6FD"/>
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="0" y="0" width="64" height="64" rx="14" ry="14" fill="url(#bg)"/>
  <!-- Letter G centered -->
  <text
    x="33"
    y="47"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="44"
    font-weight="700"
    fill="url(#letter)"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="-1"
  >G</text>
</svg>
</body>
</html>`,
  },
];

const outDir = path.join(__dirname, 'temporary screenshots');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const fav of favicons) {
  const page = await browser.newPage();
  await page.setViewport({ width: 64, height: 64, deviceScaleFactor: 2 });

  const tmpFile = path.join(outDir, `_fav_tmp_${fav.name}.html`);
  fs.writeFileSync(tmpFile, fav.html);
  await page.goto(`file://${tmpFile}`);
  await new Promise(r => setTimeout(r, 200));

  const outPath = path.join(__dirname, `${fav.name}.png`);
  await page.screenshot({
    path: outPath,
    omitBackground: true,
    clip: { x: 0, y: 0, width: 64, height: 64 },
  });

  fs.unlinkSync(tmpFile);
  console.log(`Saved: ${outPath}`);
  await page.close();
}

await browser.close();
console.log('Done.');
