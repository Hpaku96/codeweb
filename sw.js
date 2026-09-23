// Generado por src/build.mjs — no editar a mano.
const CACHE = 'code-60:1545';
const PRECACHE = [".","index.html","manifest.json","projects.json","demos/01-pavimento-aashto.html","demos/02-granulometria.html","demos/03-vigas-diagramas.html","demos/04-mezcla-concreto.html","demos/05-proctor-cbr.html","demos/06-conversor-unidades.html","demos/07-presupuesto-obra.html","demos/08-poligonal-topografia.html","demos/09-ecualizador-parametrico.html","demos/10-compresor-dinamico.html","demos/11-sintetizador-polifonico.html","demos/12-caja-de-ritmos.html","demos/13-analizador-espectro.html","demos/14-delay-reverb.html","demos/15-catalogo-cotizador.html","demos/16-crm-clientes.html","demos/17-optimizador-rutas.html","demos/18-simulador-credito.html","demos/19-panel-ventas.html","demos/20-control-inventario.html","demos/21-punto-de-venta.html","demos/22-margenes-precios.html","demos/23-api-rest-consola.html","demos/24-disenador-esquema.html","demos/25-motor-sql.html","demos/26-pipeline-etl.html","demos/27-jwt-autenticacion.html","demos/28-generador-datos.html","demos/29-monitor-logs.html","demos/30-sistema-de-color.html","assets/audio.js","assets/datos-comercial.js","assets/demo.css","assets/demo.js","assets/exportar.js","assets/grabar.js","assets/maquina.css","assets/maquina.js","assets/img/apple-touch-icon.png","assets/img/boton-on.png","assets/img/boton.png","assets/img/icon-192.png","assets/img/icon-512.png","assets/img/icon-maskable-512.png","assets/img/led-ambar.png","assets/img/led-off.png","assets/img/led-rojo.png","assets/img/led-verde.png","assets/img/madera.png","assets/img/pad-on.png","assets/img/pad.png","assets/img/panel.png","assets/img/perilla-chica.png","assets/img/perilla.png","assets/img/rejilla.png","assets/img/tornillo.png"];

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
