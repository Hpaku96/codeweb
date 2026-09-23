/**
 * CODE — genera los íconos de la PWA a partir del isotipo de marca (el mismo
 * trazo que el favicon y el logo del header), en vez de subir un PNG editado a mano.
 *
 * No corre en cada build (como sprites.mjs, es un paso aparte): los PNG resultantes
 * se commitean en assets/img/ y el manifest.json los referencia tal cual.
 *
 * Uso: node src/generar-iconos.mjs
 * (si el Chromium de Playwright por defecto no tiene el binario headless-shell,
 * exporta PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chromium antes de correrlo)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'img');
await mkdir(OUT, { recursive: true });

const MARCA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="41" fill="none" stroke="#E7B93D" stroke-width="8"/>
  <g fill="none" stroke="#E7B93D" stroke-width="5" stroke-linecap="round">
    <path d="M30 26 L52 48"/><path d="M24 34 L40 50 L40 58"/><path d="M20 44 L30 54 L30 64"/>
  </g>
  <g fill="#E7B93D"><circle cx="52" cy="48" r="5.5"/><circle cx="40" cy="58" r="5.5"/><circle cx="30" cy="64" r="5.5"/></g>
</svg>`;

function pagina(size, padPct) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#08090b}
  body{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}
  svg{width:${100 - padPct * 2}%;height:${100 - padPct * 2}%}
  </style></head><body>${MARCA_SVG}</body></html>`;
}

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}
);

const targets = [
  { file: 'icon-192.png', size: 192, padPct: 12 },
  { file: 'icon-512.png', size: 512, padPct: 12 },
  { file: 'icon-maskable-512.png', size: 512, padPct: 22 },
  { file: 'apple-touch-icon.png', size: 180, padPct: 14 }
];

for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size } });
  await page.setContent(pagina(t.size, t.padPct));
  await page.screenshot({ path: join(OUT, t.file) });
  await page.close();
  console.log(`· ${t.file}`);
}

await browser.close();
console.log(`\n${targets.length} íconos en assets/img/`);
