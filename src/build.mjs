/**
 * CODE — generador estático del portafolio.
 *
 * Lee los fragmentos de `src/pages/*.html`, cada uno con un bloque <!--meta {...}-->,
 * los envuelve en el documento base y escribe:
 *   demos/<id>-<slug>.html   una demo autocontenida por proyecto
 *   index.html               la portada, servible desde la raíz del repo
 *   projects.json            el índice que consume la portada
 *   manifest.json            metadatos de instalación de la PWA
 *   sw.js                    service worker: cachea el sitio para uso sin conexión
 *   dist/                    copia del sitio lista para desplegar
 *   artifact/index.html      la portada sin esqueleto, para publicarla alojada
 *
 * Uso: node src/build.mjs
 */
import { readdir, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = join(ROOT, 'src', 'pages');
const OUT = join(ROOT, 'demos');

const FONTS = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap';

// Isotipo de marca como favicon vectorial: mismo trazo que el logo del header, cero peticiones extra.
// El color va como "#E7B93D" (sin preescapar): encodeURIComponent ya se encarga de convertir el "#" a
// "%23" una sola vez. Escribirlo como "%23E7B93D" aquí lo codifica dos veces y el navegador termina
// recibiendo el color literal "%23E7B93D" como valor de stroke/fill, que no es un color válido: el
// ícono se renderiza invisible.
const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<circle cx="50" cy="50" r="41" fill="none" stroke="#E7B93D" stroke-width="8"/>' +
  '<g fill="none" stroke="#E7B93D" stroke-width="5" stroke-linecap="round">' +
  '<path d="M30 26 L52 48"/><path d="M24 34 L40 50 L40 58"/><path d="M20 44 L30 54 L30 64"/>' +
  '</g><g fill="#E7B93D"><circle cx="52" cy="48" r="5.5"/><circle cx="40" cy="58" r="5.5"/><circle cx="30" cy="64" r="5.5"/></g>' +
  '</svg>'
);

// Se fija el tema antes del primer pintado (localStorage > preferencia del SO > oscuro por defecto)
// para que no haya parpadeo al cargar. El botón #themeToggle solo lo alterna después (ver demo.js).
const THEME_INIT = `<script>(function(){try{var t=localStorage.getItem('code-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;

const AREAS = {
  ingenieria: 'Ingeniería',
  audio: 'Audio y música',
  negocio: 'Negocio y comercio',
  backend: 'Backend y datos'
};

function page(meta, body) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${meta.title} · CODE</title>
<meta name="description" content="${meta.tagline.replace(/"/g, '&quot;')}">
<link rel="icon" href="${FAVICON}">
${THEME_INIT}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="../assets/demo.css">
${(meta.estilos || []).map(u => `<link rel="stylesheet" href="${u}">`).join('\n')}
</head>
<body>
<div class="wrap${meta.narrow ? ' narrow' : ''}">
<header class="demo-head">
  <a class="brand-bar" href="../index.html">
    <svg viewBox="0 0 100 100" width="20" height="20" aria-hidden="true">
      <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" stroke-width="7"/>
      <g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round">
        <path d="M30 26 L52 48"/>
        <path d="M24 34 L40 50 L40 58"/>
        <path d="M20 44 L30 54 L30 64"/>
      </g>
      <g fill="currentColor">
        <circle cx="52" cy="48" r="5"/>
        <circle cx="40" cy="58" r="5"/>
        <circle cx="30" cy="64" r="5"/>
      </g>
    </svg>
    <span>CODE</span>
  </a>
  <span class="idx">${meta.id}</span>
  <h1>${meta.title}</h1>
  <div class="head-actions">
    <button type="button" class="theme-toggle" id="themeToggle" aria-pressed="false"></button>
    <a class="back" href="../index.html">← Portafolio</a>
  </div>
  <p class="sub">${meta.tagline}</p>
</header>
${body.trim()}
<footer class="demo-foot">
  <span>CODE · ${AREAS[meta.area] || meta.area} · demo ${meta.id} de 30</span>
  <span>${meta.stack.join(' · ')}</span>
</footer>
</div>
<script src="../assets/demo.js"></script>
<script src="../assets/exportar.js"></script>
${meta.libs ? meta.libs.map(u => `<script src="${u}"></script>`).join('\n') : ''}
<script>
${(meta.script || '').trim()}
</script>
</body>
</html>
`;
}

const files = (await readdir(PAGES)).filter(f => f.endsWith('.html')).sort();
await mkdir(OUT, { recursive: true });
const index = [];

for (const file of files) {
  const raw = await readFile(join(PAGES, file), 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`Falta el bloque <!--meta--> en ${file}`);
  const meta = JSON.parse(m[1]);
  let body = raw.slice(m[0].length);

  // El <script> final del fragmento se mueve al pie del documento.
  const s = body.match(/<script>([\s\S]*)<\/script>\s*$/);
  if (s) { meta.script = s[1]; body = body.slice(0, s.index); }

  const out = file;
  await writeFile(join(OUT, out), page(meta, body), 'utf8');
  index.push({
    id: meta.id, title: meta.title, tagline: meta.tagline, area: meta.area,
    areaLabel: AREAS[meta.area] || meta.area, stack: meta.stack,
    highlights: meta.highlights || [], file: `demos/${out}`
  });
  process.stdout.write(`· ${out}\n`);
}

index.sort((a, b) => a.id.localeCompare(b.id));
await writeFile(join(ROOT, 'projects.json'), JSON.stringify(index, null, 2), 'utf8');

/* ---- portada ----
   El mismo fragmento produce dos salidas: index.html, un documento completo que
   funciona abriendo el archivo o publicado en GitHub Pages, y artifact/index.html,
   sin esqueleto, para publicarlo como página alojada (esa versión conserva su
   propio <title>/<meta description>/@import intactos: los necesita tal cual
   para funcionar como fragmento independiente). */
const portada = (await readFile(join(ROOT, 'src', 'portada.html'), 'utf8'))
  .replace('/*__PROYECTOS__*/[]', JSON.stringify(index));

await mkdir(join(ROOT, 'artifact'), { recursive: true });
await writeFile(join(ROOT, 'artifact', 'index.html'), portada, 'utf8');

// Para el documento completo, el <title>, la <meta description>, el favicon y el script
// que fija el tema se extraen al <head> real en vez de dejarlos flotando dentro de <body>
// (HTML inválido y, aquí, además duplicados con los del wrapper). Sus fuentes ya llegan por
// el @import interno de la portada, así que el <link> de FONTS no se repite.
const cabecera = portada.match(/^<title>([\s\S]*?)<\/title>\s*<meta name="description" content="([\s\S]*?)">\s*<link rel="icon"[^>]*>\s*<script>[\s\S]*?<\/script>\s*/);
const tituloPortada = cabecera ? cabecera[1] : 'CODE — Ingeniería de software a medida';
const descPortada = cabecera ? cabecera[2] : 'CODE diseña y construye software a medida: desarrollo web, aplicaciones y herramientas a medida, backend e integraciones. Cobertura mundial, cotización a medida.';
const portadaSinCabecera = cabecera ? portada.slice(cabecera[0].length) : portada;

const completo = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${tituloPortada}</title>
<meta name="description" content="${descPortada}">
<meta property="og:type" content="website">
<meta property="og:title" content="${tituloPortada}">
<meta property="og:description" content="${descPortada}">
<meta name="theme-color" content="#08090b">
<link rel="icon" href="${FAVICON}">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="manifest" href="manifest.json">
${THEME_INIT}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
</head>
<body>
${portadaSinCabecera}
</body>
</html>
`;
await writeFile(join(ROOT, 'index.html'), completo, 'utf8');

/* ---- PWA: manifest + service worker ----
   Los íconos los genera aparte `npm run icons` (como sprites.mjs, no corre en cada
   build) y quedan commiteados en assets/img/. Acá solo se arma el manifest y la
   lista de precache del service worker, siempre a partir de los archivos reales del
   build — así nunca queda una demo vieja cacheada ni una nueva sin cachear. */
const manifest = {
  name: tituloPortada,
  short_name: 'CODE',
  description: descPortada,
  start_url: 'index.html',
  scope: '.',
  display: 'standalone',
  background_color: '#08090b',
  theme_color: '#08090b',
  icons: [
    { src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'assets/img/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
await writeFile(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

const assetFiles = (await readdir(join(ROOT, 'assets'), { withFileTypes: true }))
  .filter(f => f.isFile()).map(f => 'assets/' + f.name);
const imgFiles = (await readdir(join(ROOT, 'assets', 'img'), { withFileTypes: true }))
  .filter(f => f.isFile()).map(f => 'assets/img/' + f.name);
const PRECACHE = [
  '.', 'index.html', 'manifest.json', 'projects.json',
  ...files.map(f => 'demos/' + f),
  ...assetFiles, ...imgFiles
];
// Versión = huella del propio precache, no un timestamp: solo cambia (y solo entonces
// invalida la caché de los visitantes) cuando el contenido publicado realmente cambió.
const swVersion = PRECACHE.length + ':' + PRECACHE.join(',').length;
const sw = `// Generado por src/build.mjs — no editar a mano.
const CACHE = 'code-${swVersion}';
const PRECACHE = ${JSON.stringify(PRECACHE)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
`;
await writeFile(join(ROOT, 'sw.js'), sw, 'utf8');

/* ---- dist ----
   El sitio desplegable, sin el código fuente ni las dependencias: es lo que
   Netlify (o cualquier hosting estático) publica. Se reconstruye desde cero
   en cada build para que nunca arrastre archivos de una versión anterior. */
const DIST = join(ROOT, 'dist');
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(join(ROOT, 'demos'), join(DIST, 'demos'), { recursive: true });
await cp(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
await writeFile(join(DIST, 'index.html'), completo, 'utf8');
await writeFile(join(DIST, 'projects.json'), JSON.stringify(index, null, 2), 'utf8');
await writeFile(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
await writeFile(join(DIST, 'sw.js'), sw, 'utf8');

console.log(`\n${index.length} demos en demos/ · índice en projects.json`);
console.log('portada en index.html · sitio desplegable en dist/ · versión alojada en artifact/index.html');
