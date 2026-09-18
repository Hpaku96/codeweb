/**
 * CODE — generador de los PNG de las máquinas de audio.
 *
 * Rasterizador y codificador PNG escritos aquí mismo: lo único que se usa de
 * Node es zlib para comprimir los datos de imagen. Produce perillas, pads,
 * botones, LED, tornillos y las texturas de panel y madera en assets/img/.
 *
 * Uso: node src/sprites.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(ROOT, 'assets', 'img');

/* ================= PNG ================= */

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const t = Buffer.from(tipo, 'ascii');
  const cuerpo = Buffer.concat([t, Buffer.from(datos)]);
  const salida = Buffer.alloc(cuerpo.length + 8);
  salida.writeUInt32BE(datos.length, 0);
  cuerpo.copy(salida, 4);
  salida.writeUInt32BE(crc32(cuerpo), cuerpo.length + 4);
  return salida;
}

/** Codifica RGBA de 8 bits en un PNG sin pérdidas. */
function png(ancho, alto, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8;    // bits por canal
  ihdr[9] = 6;    // color verdadero con alfa
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Cada línea lleva delante su byte de filtro; con 0 se guarda tal cual.
  const crudo = Buffer.alloc(alto * (ancho * 4 + 1));
  for (let y = 0; y < alto; y++) {
    crudo[y * (ancho * 4 + 1)] = 0;
    rgba.copy
      ? rgba.copy(crudo, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4)
      : Buffer.from(rgba.buffer, y * ancho * 4, ancho * 4).copy(crudo, y * (ancho * 4 + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

/* ================= rasterizador ================= */

/** Ruido reproducible: el mismo sprite en cada máquina que corra el generador. */
function azar(semilla) {
  let s = semilla >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const lim = (v, a, b) => Math.min(b, Math.max(a, v));
const mezclar = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);

class Lienzo {
  constructor(ancho, alto) {
    this.w = ancho; this.h = alto;
    this.d = new Float64Array(ancho * alto * 4);   // premultiplicado no: rgba directo
  }

  /** Mezcla un color sobre el píxel con la cobertura indicada. */
  px(x, y, color, cobertura) {
    if (cobertura <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const a = lim(cobertura * (color[3] === undefined ? 1 : color[3]), 0, 1);
    if (a <= 0) return;
    const i = (y * this.w + x) * 4;
    const d = this.d;
    const aDst = d[i + 3];
    const aOut = a + aDst * (1 - a);
    for (let k = 0; k < 3; k++) {
      d[i + k] = (color[k] * a + d[i + k] * aDst * (1 - a)) / (aOut || 1);
    }
    d[i + 3] = aOut;
  }

  /** Recorre la caja indicada llamando a fn(x, y) → [r,g,b,a] o null. */
  pintar(x0, y0, x1, y1, fn) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x1)); x++) {
        const c = fn(x + 0.5, y + 0.5);
        if (c) this.px(x, y, c, c[4] === undefined ? 1 : c[4]);
      }
    }
  }

  /** Disco con antialias por distancia, coloreado por fn(dist01, ang, x, y). */
  disco(cx, cy, r, fn) {
    this.pintar(cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2, (x, y) => {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      const cobertura = lim(r + 0.5 - d, 0, 1);
      if (cobertura <= 0) return null;
      const c = fn(d / r, Math.atan2(dy, dx), x, y);
      if (!c) return null;
      return [c[0], c[1], c[2], c[3] === undefined ? 1 : c[3], cobertura];
    });
  }

  /** Anillo entre dos radios. */
  anillo(cx, cy, rInt, rExt, fn) {
    this.pintar(cx - rExt - 2, cy - rExt - 2, cx + rExt + 2, cy + rExt + 2, (x, y) => {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      const cobertura = Math.min(lim(rExt + 0.5 - d, 0, 1), lim(d - rInt + 0.5, 0, 1));
      if (cobertura <= 0) return null;
      const c = fn((d - rInt) / (rExt - rInt), Math.atan2(dy, dx), x, y);
      if (!c) return null;
      return [c[0], c[1], c[2], c[3] === undefined ? 1 : c[3], cobertura];
    });
  }

  /** Rectángulo de esquinas redondeadas; fn recibe coordenadas normalizadas. */
  rect(x0, y0, w, h, radio, fn) {
    this.pintar(x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2, (x, y) => {
      const dx = Math.max(x0 + radio - x, 0, x - (x0 + w - radio));
      const dy = Math.max(y0 + radio - y, 0, y - (y0 + h - radio));
      const d = Math.hypot(dx, dy);
      const cobertura = lim(radio + 0.5 - d, 0, 1);
      if (cobertura <= 0) return null;
      const c = fn((x - x0) / w, (y - y0) / h, x, y);
      if (!c) return null;
      return [c[0], c[1], c[2], c[3] === undefined ? 1 : c[3], cobertura];
    });
  }

  bytes() {
    const out = Buffer.alloc(this.w * this.h * 4);
    for (let i = 0; i < this.w * this.h * 4; i += 4) {
      out[i] = lim(Math.round(this.d[i]), 0, 255);
      out[i + 1] = lim(Math.round(this.d[i + 1]), 0, 255);
      out[i + 2] = lim(Math.round(this.d[i + 2]), 0, 255);
      out[i + 3] = lim(Math.round(this.d[i + 3] * 255), 0, 255);
    }
    return out;
  }
}

/* ================= paleta de la máquina ================= */

const ORO = [231, 185, 61];
const ORO_OSC = [150, 114, 30];
const METAL = [58, 58, 62];
const METAL_CLARO = [122, 122, 128];
const METAL_OSC = [24, 24, 27];
const GOMA = [38, 38, 43];
const GOMA_CLARA = [70, 70, 78];
const MADERA = [92, 58, 33];
const MADERA_OSC = [54, 33, 19];

/* ================= sprites ================= */

/** Perilla estriada de metal con testigo dorado apuntando arriba. */
function perilla(tam) {
  const L = new Lienzo(tam, tam);
  const c = tam / 2, r = tam * 0.46;
  const rnd = azar(7);

  // Sombra proyectada
  L.disco(c, c + tam * 0.03, r, (d) => [0, 0, 0, 0.45 * (1 - suave(lim(d, 0, 1)))]);

  // Falda estriada: 44 muescas alrededor del borde
  L.anillo(c, c, r * 0.82, r, (t, ang) => {
    const estria = (Math.sin(ang * 44) + 1) / 2;
    const luz = suave(lim(0.5 + Math.cos(ang + Math.PI / 2.4) * 0.6, 0, 1));
    const base = mezclar(METAL_OSC[0], METAL_CLARO[0], luz * 0.85);
    const v = base * mezclar(0.72, 1.12, estria);
    return [v, v * 0.99, v * 1.04];
  });

  // Cuerpo: degradado cónico para simular metal torneado
  L.disco(c, c, r * 0.84, (d, ang, x, y) => {
    const luz = suave(lim(0.5 + Math.cos(ang + Math.PI / 2.4) * 0.55, 0, 1));
    const caida = 1 - Math.pow(d, 2.6) * 0.55;
    const grano = (rnd() - 0.5) * 6;
    const v = mezclar(METAL_OSC[0] + 6, METAL_CLARO[0], luz * 0.7) * caida + grano;
    return [v, v * 0.99, v * 1.05];
  });

  // Bisel superior
  L.anillo(c, c, r * 0.78, r * 0.86, (t, ang) => {
    const luz = suave(lim(0.5 + Math.cos(ang + Math.PI / 2.4) * 0.9, 0, 1));
    const v = mezclar(30, 168, luz);
    return [v, v, v * 1.03, 0.75];
  });

  // Tapa central
  L.disco(c, c, r * 0.5, (d, ang) => {
    const luz = suave(lim(0.62 + Math.cos(ang + Math.PI / 2.2) * 0.38 - d * 0.35, 0, 1));
    const v = mezclar(26, 96, luz);
    return [v, v, v * 1.06];
  });

  // Testigo dorado hacia arriba
  const anchoT = tam * 0.045;
  L.rect(c - anchoT / 2, c - r * 0.78, anchoT, r * 0.5, anchoT / 2, (u, v) => {
    const brillo = mezclar(1.12, 0.78, v);
    return [ORO[0] * brillo, ORO[1] * brillo, ORO[2] * brillo];
  });

  // Reflejo especular arriba a la izquierda
  L.disco(c - r * 0.3, c - r * 0.34, r * 0.34, (d) => {
    const a = Math.pow(1 - lim(d, 0, 1), 2.4) * 0.22;
    return [255, 252, 240, a];
  });

  return L;
}

/** Pad de goma tipo MPC; encendido lo ilumina en oro. */
function pad(tam, encendido) {
  const L = new Lienzo(tam, tam);
  const m = tam * 0.06, lado = tam - m * 2, radio = tam * 0.12;
  const rnd = azar(encendido ? 21 : 11);

  L.rect(m, m + tam * 0.025, lado, lado, radio, () => [0, 0, 0, 0.5]);

  L.rect(m, m, lado, lado, radio, (u, v) => {
    const base = encendido ? ORO : GOMA;
    const alto = encendido ? [255, 228, 150] : GOMA_CLARA;
    // Luz desde arriba y caída hacia los bordes
    const luz = suave(lim(1 - v * 1.25, 0, 1)) * 0.75 + 0.25;
    const borde = suave(lim(Math.min(u, 1 - u, v, 1 - v) * 7, 0, 1));
    const grano = (rnd() - 0.5) * (encendido ? 7 : 11);
    return [0, 1, 2].map(k =>
      mezclar(base[k] * 0.55, mezclar(base[k], alto[k], luz * 0.5), borde) * (0.9 + luz * 0.2) + grano);
  });

  // Bisel superior claro y sombra inferior: da el volumen de goma
  L.rect(m + lado * 0.07, m + lado * 0.05, lado * 0.86, lado * 0.16, radio * 0.6, (u, v) => {
    const a = (1 - v) * (encendido ? 0.3 : 0.16);
    return [255, 255, 250, a];
  });
  L.rect(m + lado * 0.07, m + lado * 0.8, lado * 0.86, lado * 0.15, radio * 0.6, (u, v) => [0, 0, 0, v * 0.3]);

  if (encendido) {
    // Halo alrededor del pad iluminado
    L.rect(m - tam * 0.03, m - tam * 0.03, lado + tam * 0.06, lado + tam * 0.06, radio * 1.3, (u, v) => {
      const borde = 1 - suave(lim(Math.min(u, 1 - u, v, 1 - v) * 9, 0, 1));
      return [ORO[0], ORO[1], ORO[2], borde * 0.35];
    });
  }
  return L;
}

/** Botón rectangular de panel. */
function boton(ancho, alto, encendido) {
  const L = new Lienzo(ancho, alto);
  const m = ancho * 0.04, w = ancho - m * 2, h = alto - m * 2, radio = alto * 0.22;
  L.rect(m, m + alto * 0.05, w, h, radio, () => [0, 0, 0, 0.45]);
  L.rect(m, m, w, h, radio, (u, v) => {
    // Encendido se tiñe de oro claro para que el rótulo oscuro encima se lea.
    const base = encendido ? [182, 142, 44] : METAL;
    const luz = suave(lim(1 - v * 1.4, 0, 1));
    const borde = suave(lim(Math.min(u, 1 - u, v, 1 - v) * 9, 0, 1));
    return [0, 1, 2].map(k => mezclar(base[k] * 0.5, mezclar(base[k], base[k] + 60, luz), borde));
  });
  L.rect(m + w * 0.06, m + h * 0.08, w * 0.88, h * 0.34, radio * 0.7, (u, v) =>
    [255, 250, 240, (1 - v) * (encendido ? 0.22 : 0.16)]);
  return L;
}

/** Testigo LED. */
function led(tam, color, encendido) {
  const L = new Lienzo(tam, tam);
  const c = tam / 2;
  if (encendido) {
    L.disco(c, c, tam * 0.48, d => [color[0], color[1], color[2], Math.pow(1 - lim(d, 0, 1), 2.2) * 0.55]);
  }
  L.anillo(c, c, tam * 0.24, tam * 0.31, () => [18, 18, 20, 0.9]);
  L.disco(c, c, tam * 0.25, (d, ang) => {
    const f = encendido ? mezclar(1.25, 0.55, d) : 0.22;
    return [color[0] * f, color[1] * f, color[2] * f];
  });
  L.disco(c - tam * 0.07, c - tam * 0.08, tam * 0.1, d =>
    [255, 255, 255, Math.pow(1 - lim(d, 0, 1), 2) * (encendido ? 0.75 : 0.3)]);
  return L;
}

/** Tornillo de panel, con la ranura girada. */
function tornillo(tam, giro) {
  const L = new Lienzo(tam, tam);
  const c = tam / 2, r = tam * 0.42;
  L.disco(c, c + tam * 0.04, r, () => [0, 0, 0, 0.4]);
  L.disco(c, c, r, (d, ang) => {
    const luz = suave(lim(0.5 + Math.cos(ang + Math.PI / 2.4) * 0.8 - d * 0.3, 0, 1));
    const v = mezclar(38, 150, luz);
    return [v, v, v * 1.04];
  });
  L.anillo(c, c, r * 0.82, r, () => [20, 20, 22, 0.55]);
  // Ranura
  const largo = r * 1.3, grosor = tam * 0.09;
  const cosg = Math.cos(giro), sing = Math.sin(giro);
  L.pintar(0, 0, tam, tam, (x, y) => {
    const dx = x - c, dy = y - c;
    const u = dx * cosg + dy * sing, v = -dx * sing + dy * cosg;
    if (Math.abs(u) > largo / 2 || Math.abs(v) > grosor / 2) return null;
    if (Math.hypot(dx, dy) > r * 0.92) return null;
    return [14, 14, 16, 0.9];
  });
  return L;
}

/** Textura de panel metálico cepillado, repetible en horizontal y vertical. */
function panel(tam) {
  const L = new Lienzo(tam, tam);
  const rnd = azar(99);
  /* La variación vertical se arma con senos de periodo entero sobre el lado del
     mosaico: así el último renglón enlaza con el primero y no aparece la costura
     horizontal que deja el ruido puro al repetir la textura. */
  const vetas = new Float64Array(tam);
  const armonicos = [[3, 3.4], [7, 2.1], [13, 1.4], [29, 0.9], [61, 0.6]];
  for (let y = 0; y < tam; y++) {
    let v = 0;
    armonicos.forEach(([k, amp], i) => { v += Math.sin(2 * Math.PI * k * y / tam + i * 1.7) * amp; });
    vetas[y] = v;
  }
  L.pintar(0, 0, tam, tam, (x, y) => {
    const iy = Math.floor(y);
    const brillo = (rnd() - 0.5) * 4 + vetas[iy];
    const v = METAL[0] * 0.78 + brillo;
    return [v, v * 0.99, v * 1.03];
  });
  return L;
}

/** Costado de madera, repetible en vertical. */
function madera(ancho, alto) {
  const L = new Lienzo(ancho, alto);
  const rnd = azar(303);
  const desvio = new Float64Array(alto);
  for (let y = 0; y < alto; y++) desvio[y] = Math.sin(y / alto * Math.PI * 2) * ancho * 0.12 + (rnd() - 0.5) * 2;
  L.pintar(0, 0, ancho, alto, (x, y) => {
    const iy = Math.floor(y);
    const u = (x + desvio[iy]) / ancho;
    // Anillos de la veta
    const veta = (Math.sin(u * Math.PI * 7) + Math.sin(u * Math.PI * 17 + 1.3) * 0.5) / 1.5;
    const t = suave(lim(veta * 0.5 + 0.5, 0, 1));
    const grano = (rnd() - 0.5) * 7;
    const base = [0, 1, 2].map(k => mezclar(MADERA_OSC[k], MADERA[k], t) + grano);
    // Sombra en los bordes para dar canto
    const borde = suave(lim(Math.min(x, ancho - x) / (ancho * 0.22), 0, 1));
    return base.map(v => v * mezclar(0.55, 1, borde));
  });
  return L;
}

/** Rejilla de altavoz, repetible. */
function rejilla(tam) {
  const L = new Lienzo(tam, tam);
  const paso = tam / 8;
  L.pintar(0, 0, tam, tam, () => [0, 0, 0, 0]);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const cx = (x + 0.5) * paso + (y % 2 ? paso / 2 : 0);
      const cy = (y + 0.5) * paso;
      L.disco(cx % tam, cy, paso * 0.26, d => [10, 10, 12, 0.85 * (1 - d * 0.3)]);
      L.anillo(cx % tam, cy, paso * 0.26, paso * 0.32, () => [150, 150, 155, 0.16]);
    }
  }
  return L;
}

/* ================= salida ================= */

const SPRITES = [
  ['perilla.png', () => perilla(256)],
  ['perilla-chica.png', () => perilla(160)],
  ['pad.png', () => pad(256, false)],
  ['pad-on.png', () => pad(256, true)],
  ['boton.png', () => boton(224, 96, false)],
  ['boton-on.png', () => boton(224, 96, true)],
  ['led-rojo.png', () => led(64, [226, 74, 58], true)],
  ['led-ambar.png', () => led(64, ORO, true)],
  ['led-verde.png', () => led(64, [96, 214, 148], true)],
  ['led-off.png', () => led(64, [120, 120, 126], false)],
  ['tornillo.png', () => tornillo(48, Math.PI / 5)],
  ['panel.png', () => panel(256)],
  ['madera.png', () => madera(96, 512)],
  ['rejilla.png', () => rejilla(128)]
];

await mkdir(DESTINO, { recursive: true });
let total = 0;
for (const [nombre, hacer] of SPRITES) {
  const lienzo = hacer();
  const datos = png(lienzo.w, lienzo.h, lienzo.bytes());
  await writeFile(join(DESTINO, nombre), datos);
  total += datos.length;
  console.log(`· ${nombre.padEnd(20)} ${lienzo.w}×${lienzo.h}  ${(datos.length / 1024).toFixed(1)} KB`);
}
console.log(`\n${SPRITES.length} sprites en assets/img/ · ${(total / 1024).toFixed(1)} KB en total`);
