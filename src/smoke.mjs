/**
 * CODE — prueba de humo de las demos.
 * Abre cada archivo de demos/ en Chromium, interactúa con sus controles
 * y falla si alguna lanza un error de consola o deja un resultado en «—».
 *
 * Uso: node src/smoke.mjs [filtro]
 */
import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const filtro = process.argv[2] || '';
const files = (await readdir(join(ROOT, 'demos'))).filter(f => f.endsWith('.html') && f.includes(filtro)).sort();

const browser = await chromium.launch();
let fallos = 0;

for (const f of files) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
  const errores = [];
  // Las fuentes de Google no se descargan en el entorno de prueba: no es un fallo de la demo.
  const ruido = t => /fonts\.(googleapis|gstatic)|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/.test(t);
  page.on('console', m => { if (m.type() === 'error' && !ruido(m.text())) errores.push('console: ' + m.text()); });
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));

  await page.goto(pathToFileURL(resolve(ROOT, 'demos', f)).href, { waitUntil: 'load' });
  await page.waitForTimeout(350);

  // Mueve cada range y cada select, y pulsa los botones que no sean destructivos.
  for (const r of await page.$$('input[type=range]')) {
    await r.evaluate(el => {
      const lo = +el.min || 0, hi = +el.max || 100;
      el.value = String(lo + (hi - lo) * 0.66);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  for (const s of await page.$$('select')) {
    await s.evaluate(el => {
      if (el.options.length > 1) {
        el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  await page.waitForTimeout(250);

  // Las demos de audio dejan lecturas en «—» hasta que suena algo: no es un fallo.
  const esAudio = await page.$('#play, #activar') !== null;
  if (!esAudio) {
    const pendientes = await page.$$eval('.readout .v', els => els.filter(e => e.textContent.trim() === '—').length);
    if (pendientes) errores.push(`${pendientes} lectura(s) sin calcular`);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) errores.push('desbordamiento horizontal');

  if (errores.length) { fallos++; console.log(`✗ ${f}\n   ${errores.join('\n   ')}`); }
  else console.log(`✓ ${f}`);
  await page.close();
}

await browser.close();
console.log(`\n${files.length - fallos}/${files.length} demos sin errores`);
process.exit(fallos ? 1 : 0);
