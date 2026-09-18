/**
 * CODE — verifica que lo que exportan las demos sean archivos válidos y con datos.
 *
 * Abre cada demo con barra de exportación, pulsa los cuatro botones, guarda lo
 * descargado y comprueba la estructura de cada formato (firma, tamaño y, en el
 * CSV, que las tablas traigan filas de verdad).
 *
 * Uso: node src/probar-exportacion.mjs [filtro]
 */
import { chromium } from 'playwright';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const filtro = process.argv[2] || '';
const demos = (await readdir(join(ROOT, 'demos')))
  .filter(f => f.endsWith('.html') && f.includes(filtro)).sort();

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ acceptDownloads: true });
let fallos = 0, sinBarra = 0;

for (const demo of demos) {
  const carpeta = await mkdtemp(join(tmpdir(), 'code-export-'));
  const page = await ctx.newPage();
  const errores = [];
  const ruido = t => /fonts\.(googleapis|gstatic)|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/.test(t);
  page.on('console', m => { if (m.type() === 'error' && !ruido(m.text())) errores.push(m.text()); });
  page.on('pageerror', e => errores.push(e.message));

  await page.goto(pathToFileURL(resolve(ROOT, 'demos', demo)).href);
  await page.waitForTimeout(350);

  if (!(await page.$('.export-bar'))) {
    sinBarra++;
    console.log(`· ${demo.padEnd(34)} sin barra de exportación`);
    await page.close();
    await rm(carpeta, { recursive: true, force: true });
    continue;
  }

  const tam = {};
  for (const formato of ['csv', 'xlsx', 'docx', 'pdf']) {
    try {
      const [descarga] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.click(`.export-bar button[data-formato="${formato}"]`)
      ]);
      const destino = join(carpeta, descarga.suggestedFilename());
      await descarga.saveAs(destino);
      const bytes = new Uint8Array(await readFile(destino));
      tam[formato] = bytes.length;

      if (formato === 'csv') {
        const csv = await readFile(destino, 'utf8');
        if (!csv.startsWith('﻿')) errores.push('CSV sin BOM');
        // Debe haber al menos una tabla o un resumen con datos, no solo el título.
        const utiles = csv.split(/\r?\n/).filter(l => l.trim() && l.includes(','));
        if (utiles.length < 2) errores.push('CSV sin filas de datos');
      } else if (formato === 'pdf') {
        const pdf = await readFile(destino, 'latin1');
        if (!pdf.startsWith('%PDF-')) errores.push('PDF sin cabecera');
        if (!pdf.trimEnd().endsWith('%%EOF')) errores.push('PDF sin fin');
        const inicio = +(/startxref\s+(\d+)/.exec(pdf) || [])[1];
        if (!(inicio > 0) || pdf.slice(inicio, inicio + 4) !== 'xref') errores.push('PDF con startxref inválido');
        if (/Ã.|Â./.test(pdf)) errores.push('PDF con acentos mal codificados');
      } else {
        if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) errores.push(`${formato} sin firma ZIP`);
        if (bytes.length < 900) errores.push(`${formato} demasiado pequeño`);
      }
    } catch (e) {
      errores.push(`${formato}: ${e.message.split('\n')[0]}`);
    }
  }

  if (errores.length) {
    fallos++;
    console.log(`✗ ${demo}\n   ${errores.join('\n   ')}`);
  } else {
    const resumen = ['csv', 'xlsx', 'docx', 'pdf'].map(f => `${f} ${(tam[f] / 1024).toFixed(1)}k`).join('  ');
    console.log(`✓ ${demo.padEnd(34)} ${resumen}`);
  }
  await page.close();
  await rm(carpeta, { recursive: true, force: true });
}

await navegador.close();
const conBarra = demos.length - sinBarra;
console.log(`\n${conBarra - fallos}/${conBarra} demos exportan los cuatro formatos correctamente` +
  (sinBarra ? ` · ${sinBarra} sin barra (demos de audio)` : ''));
process.exit(fallos ? 1 : 0);
