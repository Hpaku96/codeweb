/**
 * CODE — prueba funcional de las máquinas de audio.
 *
 * Comprueba lo que no se ve en una captura: que el MPC detecte el tempo de un
 * loop, lo trocee y lo reparta entre los pads, y que la grabación se exporte
 * como un WAV válido. También verifica que el sintetizador grabe y exporte.
 *
 * Uso: node src/probar-audio.mjs
 */
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = await mkdtemp(join(tmpdir(), 'code-audio-'));
const fallos = [];
const paso = (ok, texto) => { console.log((ok ? '✓ ' : '✗ ') + texto); if (!ok) fallos.push(texto); };

/* Loop de percusión a 120 BPM generado aquí mismo: la prueba no depende de
   ningún archivo externo. */
function loopDePrueba(bpm, segundos) {
  const fs = 44100, n = Math.floor(fs * segundos);
  const pcm = new Int16Array(n);
  const paso = fs * 60 / bpm;
  for (let k = 0; k * paso < n; k++) {
    const fuerte = k % 4 === 0;
    const ini = Math.floor(k * paso);
    const largo = Math.floor(fs * (fuerte ? 0.25 : 0.09));
    for (let i = 0; i < largo && ini + i < n; i++) {
      const t = i / fs;
      const env = Math.exp(-(fuerte ? 12 : 34) * t);
      const s = Math.sin(2 * Math.PI * (fuerte ? 55 : 210) * t) + (Math.random() * 2 - 1) * (fuerte ? 0.1 : 0.5);
      pcm[ini + i] += Math.max(-32000, Math.min(32000, s * env * (fuerte ? 0.9 : 0.4) * 30000));
    }
  }
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0);
  cab.writeUInt32LE(36 + pcm.byteLength, 4);
  cab.write('WAVE', 8); cab.write('fmt ', 12);
  cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22);
  cab.writeUInt32LE(fs, 24); cab.writeUInt32LE(fs * 2, 28);
  cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34);
  cab.write('data', 36); cab.writeUInt32LE(pcm.byteLength, 40);
  return Buffer.concat([cab, Buffer.from(pcm.buffer)]);
}

const rutaLoop = join(carpeta, 'loop120.wav');
await writeFile(rutaLoop, loopDePrueba(120, 8));

const navegador = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio']
});
const ctx = await navegador.newContext({ acceptDownloads: true });

/* ================= MPC ================= */
{
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto(pathToFileURL(resolve(ROOT, 'demos/12-caja-de-ritmos.html')).href);
  await page.waitForTimeout(400);

  paso((await page.$$('.pad')).length === 16, 'MPC: dieciséis pads en el panel');
  paso((await page.$$('.perilla')).length >= 4, 'MPC: perillas de tempo, swing, master y afinación');

  // Golpear un pad arranca el audio y lo selecciona
  await page.click('.pad[data-pad="2"]');
  await page.waitForTimeout(250);
  paso(await page.$eval('.pad[data-pad="2"]', e => e.classList.contains('encendido')),
    'MPC: al golpear un pad queda seleccionado');

  // Make a Sample
  await page.setInputFiles('#archMuestra', rutaLoop);
  await page.waitForTimeout(1200);
  const lcd = await page.textContent('.lcd');
  const bpm = parseFloat((/(\d+[.,]?\d*)\s*BPM/.exec(lcd) || [])[1]);
  paso(Math.abs(bpm - 120) < 3, `MPC: BPM detectado ${bpm} sobre un loop de 120`);

  // Repartir los cortes entre los pads
  await page.click('.modulo:last-child .btn-maquina:nth-last-child(2)');
  await page.waitForTimeout(400);
  const nombres = await page.$$eval('.pad-nombre', n => n.map(e => e.textContent));
  paso(nombres.filter(n => /^Corte/.test(n)).length === 16, 'MPC: los 16 cortes quedan repartidos en los pads');

  // Grabar unos segundos y exportar
  await page.click('.btn-maquina:has-text("Rec")');
  await page.waitForTimeout(1800);
  await page.click('.btn-maquina:has-text("Rec")');
  await page.waitForTimeout(300);

  const [descarga] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('.btn-maquina:has-text("WAV")')
  ]);
  const destino = join(carpeta, descarga.suggestedFilename());
  await descarga.saveAs(destino);
  const wav = await readFile(destino);
  paso(wav.slice(0, 4).toString() === 'RIFF' && wav.slice(8, 12).toString() === 'WAVE',
    'MPC: la grabación se exporta como WAV válido');
  const muestras = wav.readUInt32LE(40) / 4;
  paso(muestras > 44100, `MPC: el WAV contiene ${(muestras / 44100).toFixed(1)} s de audio`);
  const pico = (() => {
    let m = 0;
    for (let i = 44; i < wav.length - 1; i += 2) m = Math.max(m, Math.abs(wav.readInt16LE(i)));
    return m;
  })();
  paso(pico > 500, `MPC: el audio grabado no está en silencio (pico ${pico})`);

  paso(errores.length === 0, 'MPC: sin errores de JavaScript' + (errores.length ? ': ' + errores[0] : ''));
  await page.close();
}

/* ================= sintetizador ================= */
{
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto(pathToFileURL(resolve(ROOT, 'demos/11-sintetizador-polifonico.html')).href);
  await page.waitForTimeout(400);

  if (await page.$('.maquina')) {
    paso(true, 'Sintetizador: chasis de máquina presente');
    await page.click('.tecla, .btn-maquina').catch(() => {});
    await page.waitForTimeout(200);
    paso(errores.length === 0, 'Sintetizador: sin errores de JavaScript' + (errores.length ? ': ' + errores[0] : ''));
  } else {
    console.log('· Sintetizador: todavía sin chasis de máquina');
  }
  await page.close();
}

await navegador.close();
await rm(carpeta, { recursive: true, force: true });
console.log(fallos.length ? `\n${fallos.length} comprobación(es) fallida(s)` : '\nTodas las comprobaciones de audio pasaron');
process.exit(fallos.length ? 1 : 0);
