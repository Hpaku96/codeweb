# CODE — Portafolio de 30 proyectos

Treinta piezas de software funcionando, no capturas de pantalla. Cada una abre en el navegador,
corre sin servidor y se puede tocar: calculadoras de ingeniería civil, procesadores de audio en
tiempo real, herramientas para una distribuidora y la capa de datos que sostiene a todas ellas.

**Portada:** [`index.html`](index.html) · **Demos:** [`demos/`](demos/)

---

## Cómo verlo

```bash
git clone https://github.com/<tu-usuario>/code-portafolio.git
cd code-portafolio
# basta con abrir index.html en el navegador
```

O servirlo, si prefieres:

```bash
npx serve .          # o: python3 -m http.server 8080
```

---

## Desplegar

`npm run build` deja el sitio listo para publicar en `dist/`: la portada, las 30 demos y los assets,
sin el código fuente ni las dependencias.

**Netlify** — la configuración ya está en [`netlify.toml`](netlify.toml), así que basta con conectar
el repositorio; no hay que tocar nada en el panel.

| Ajuste | Valor |
|--------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |

Si el panel de Netlify tiene otro valor guardado, gana el del panel sobre `netlify.toml`: déjalo en
`dist` o bórralo para que tome el del archivo.

**GitHub Pages** — sirve desde la raíz, donde el build también deja `index.html` y `demos/`:
*Settings → Pages → Deploy from a branch → main / (root)*.

**Cualquier otro hosting estático** — sube el contenido de `dist/`. No necesita servidor, ni
proceso Node, ni base de datos.

---

## Los 30 proyectos

### Ingeniería

| # | Proyecto | De qué trata |
|---|----------|--------------|
| 01 | [Diseño de pavimento flexible AASHTO 93](demos/01-pavimento-aashto.html) | Resuelve el número estructural por bisección y verifica el paquete de capas |
| 02 | [Análisis granulométrico](demos/02-granulometria.html) | Curva granulométrica, D10/D30/D60 y doble clasificación SUCS y AASHTO |
| 03 | [Diagramas de cortante y momento](demos/03-vigas-diagramas.html) | Reacciones, V(x), M(x) y módulo de sección requerido |
| 04 | [Diseño de mezcla de concreto ACI 211.1](demos/04-mezcla-concreto.html) | Dosificación por volumen absoluto con corrección por humedad |
| 05 | [Proctor modificado y ensayo CBR](demos/05-proctor-cbr.html) | Ajuste por mínimos cuadrados y doble lectura de CBR |
| 06 | [Conversor de unidades](demos/06-conversor-unidades.html) | Doce magnitudes resueltas a la vez, con temperatura afín |
| 07 | [Presupuesto de obra con APU](demos/07-presupuesto-obra.html) | Rendimiento, cuadrilla, herramientas y resumen con IGV |
| 08 | [Cierre y compensación de poligonal](demos/08-poligonal-topografia.html) | Bowditch, error de cierre y área por Gauss |

### Audio y producción musical

| # | Proyecto | De qué trata |
|---|----------|--------------|
| 09 | [EQ-5 · ecualizador paramétrico](demos/09-ecualizador-parametrico.html) | Cinco biquads en perillas, con la respuesta medida y grabación de la salida |
| 10 | [COMP-1 · compresor de dinámica](demos/10-compresor-dinamico.html) | Curva de transferencia con rodilla suave y medidores de reducción |
| 11 | [POLY-6 · sintetizador analógico](demos/11-sintetizador-polifonico.html) | Dos osciladores, ADSR, metrónomo, grabación y teclado sobre el panel |
| 12 | [MPC-16 · caja de ritmos con samples](demos/12-caja-de-ritmos.html) | Pads con samples propios, Make a Sample con detección de BPM y exportación |
| 13 | [SPECTRA · analizador y sonoridad](demos/13-analizador-espectro.html) | FFT, espectrograma y LUFS con ponderación K de la ITU-R BS.1770 |
| 14 | [SPACE-2 · delay y reverb](demos/14-delay-reverb.html) | Ping-pong sincronizado al tempo, impulso generado al vuelo y grabación |

### Negocio y comercio

| # | Proyecto | De qué trata |
|---|----------|--------------|
| 15 | [Catálogo de precios y cotizador](demos/15-catalogo-cotizador.html) | Escalas de volumen, carrito y documento de cotización |
| 16 | [CRM de cartera y prospectos](demos/16-crm-clientes.html) | Tablero de etapas con arrastrar y soltar y alerta de visita |
| 17 | [Optimizador de rutas de reparto](demos/17-optimizador-rutas.html) | Vecino más cercano + 2-opt sobre coordenadas reales |
| 18 | [Simulador de crédito](demos/18-simulador-credito.html) | Cronograma francés y alemán, TCEA por bisección |
| 19 | [Panel de ventas](demos/19-panel-ventas.html) | Doce meses por vendedor y línea, con margen y ranking |
| 20 | [Control de inventario](demos/20-control-inventario.html) | Punto de reorden, lote económico y orden de compra sugerida |
| 21 | [Punto de venta para restaurante](demos/21-punto-de-venta.html) | Comandas por mesa, propina y vuelto |
| 22 | [Márgenes, precios y equilibrio](demos/22-margenes-precios.html) | Costo real por canal y punto de equilibrio |

### Backend y datos

| # | Proyecto | De qué trata |
|---|----------|--------------|
| 23 | [API REST con consola](demos/23-api-rest-consola.html) | Enrutador, autenticación, paginación y validación |
| 24 | [Diseñador de esquema de base de datos](demos/24-disenador-esquema.html) | Diagrama ER arrastrable que emite SQL en tres dialectos |
| 25 | [Motor SQL en el navegador](demos/25-motor-sql.html) | Tokenizador y analizador propios: JOIN, GROUP BY, HAVING |
| 26 | [Pipeline ETL de listas de precios](demos/26-pipeline-etl.html) | Extraer, limpiar, validar, transformar y cargar |
| 27 | [Firma y verificación de JWT](demos/27-jwt-autenticacion.html) | SHA-256 y HMAC implementados a mano |
| 28 | [Generador de datos de prueba](demos/28-generador-datos.html) | PRNG con semilla y cuatro serializadores |
| 29 | [Monitor de logs y métricas](demos/29-monitor-logs.html) | Percentiles sobre ventana móvil y simulación de incidente |
| 30 | [Generador de sistema de color](demos/30-sistema-de-color.html) | Escalas en OKLCH y verificación de contraste WCAG |

---

## Cómo está construido

Sin frameworks ni dependencias en tiempo de ejecución: las demos son HTML, CSS y JavaScript
que el navegador ejecuta tal cual. Lo único que se instala es Playwright, y solo para las pruebas.

```
assets/            hoja de estilos, utilidades compartidas y datos de ejemplo
  demo.css         sistema de diseño: tokens de color, tema claro y oscuro, componentes
  demo.js          $, gráficos SVG, formato de números, consola
  exportar.js      CSV, XLSX, DOCX y PDF escritos a mano, sin librerías
  audio.js         AudioContext perezoso, ruido rosa, impulsos, rejilla de frecuencia
  grabar.js        grabación de la salida, WAV propio, MP3 y detección de BPM
  maquina.css/js   chasis, perillas, pads, botones, testigos y pantalla LCD
  img/             perillas, pads, botones, LED, panel y madera (PNG generados)
  datos-comercial.js  catálogo, cartera y series de venta sintéticas
src/
  pages/           un fragmento por proyecto, con su bloque <!--meta--> y su script
  portada.html     fragmento de la portada
  build.mjs        generador estático
  sprites.mjs      rasterizador y codificador PNG propios: dibuja assets/img/
  smoke.mjs        prueba de humo
  probar-exportacion.mjs  descarga los cuatro formatos y valida su estructura
  probar-audio.mjs        detecta BPM, trocea, graba y valida el WAV exportado
demos/             salida generada: una demo autónoma por proyecto
index.html         salida generada: la portada
projects.json      salida generada: el índice que consume la portada
dist/              salida generada: el sitio listo para desplegar (no versionado)
netlify.toml       configuración de despliegue
```

### Construir

```bash
node src/build.mjs
```

Lee cada fragmento de `src/pages/`, lo envuelve en el documento base y escribe `demos/`,
`index.html`, `projects.json` y `dist/`. Agregar un proyecto es agregar un archivo a
`src/pages/`: el índice, los filtros y la portada se actualizan solos.

### Probar

```bash
npm install          # solo Playwright
node src/smoke.mjs   # abre las 30 demos en Chromium
```

La prueba de humo carga cada demo, mueve todos sus controles deslizantes y selectores, y falla si
alguna lanza un error de consola, deja una lectura sin calcular o desborda horizontalmente.

```
✓ 01-pavimento-aashto.html
✓ 02-granulometria.html
…
30/30 demos sin errores
```

---

## Exportar resultados

Las 24 herramientas llevan una barra de exportación bajo el encabezado: **CSV**, **Excel**,
**Word** y **PDF**, siempre con lo que hay en pantalla en ese momento.

Nada de esto usa librerías. El `.xlsx` y el `.docx` son archivos ZIP armados en
[`assets/exportar.js`](assets/exportar.js) —con su propio CRC32 y sus cabeceras— y el PDF se
escribe objeto por objeto, con su tabla de referencias cruzadas y el texto codificado en WinAnsi
para que los acentos salgan bien. Los números llegan a Excel como números, no como texto.

```bash
npm run test:export     # abre las 30 demos, pulsa los cuatro botones y valida cada archivo
```

---

## Las máquinas de audio

Las seis demos de audio se presentan como aparatos: costados de madera, panel metálico, perillas
que giran 270°, pads de goma, testigos y pantalla. Las imágenes son PNG generados por
[`src/sprites.mjs`](src/sprites.mjs), un rasterizador y un codificador PNG escritos para este
repositorio: lo único que toma de Node es `zlib` para comprimir.

```bash
npm run sprites         # vuelve a dibujar assets/img/
```

- **MPC-16** carga un sample por pad y tiene **Make a Sample**: detecta el BPM del audio por
  autocorrelación de su envolvente, ajusta la velocidad al tempo de la máquina y parte la región
  en 16 cortes exactos que se reparten entre los pads.
- **POLY-6** suma metrónomo con acento en el primer tiempo y graba la interpretación.
- **EQ-5**, **COMP-1** y **SPACE-2** graban su salida ya procesada.
- Todas exportan en **WAV** —escrito a mano— y en **MP3**, con el codificador descargado solo al
  momento de exportar y vuelta a WAV si no está disponible.

```bash
npm run test:audio      # comprueba la detección de BPM, el troceado y el WAV exportado
```

---

## Decisiones de diseño

- **Un solo sistema visual.** Las treinta comparten tokens de color, escala tipográfica y
  componentes. Cambiar `assets/demo.css` cambia las treinta a la vez.
- **Tema claro y oscuro de verdad.** Todo color sale de un token definido en `:root` y redefinido
  para el modo oscuro; ningún color vive solo dentro de una media query.
- **Nada de datos reales.** El catálogo, los clientes y las series de venta son sintéticos y no
  corresponden a ninguna empresa ni persona real.
- **Cero dependencias en ejecución.** La única excepción es el codificador MP3, que se descarga
  de un CDN solo cuando el usuario pide un MP3.
- **Cálculos, no maquetas.** Las fórmulas son las de las normas que citan. Cuando no hay despeje
  algebraico —AASHTO 93, la TCEA— se resuelve numéricamente y se dice cuántas iteraciones tomó.

---

## Contacto

**Hamawt'a** — desarrollo a medida, automatización de procesos y proyectos web.
📧 emeerrece2020@gmail.com · Lima, Perú

---

## Licencia

MIT. Ver [LICENSE](LICENSE).
