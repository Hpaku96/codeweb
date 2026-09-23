/* CODE — utilidades compartidas por las demos. Sin dependencias. */
(function (global) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Crea un elemento. el('div.card', {id:'x'}, [hijo, 'texto']) */
  function el(spec, attrs, children) {
    const [tagPart, ...classes] = String(spec).split('.');
    const node = document.createElement(tagPart || 'div');
    if (classes.length) node.className = classes.join(' ');
    if (attrs) for (const k in attrs) {
      if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(c => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const num = (v, fallback) => { const n = parseFloat(v); return Number.isFinite(n) ? n : (fallback || 0); };

  /**
   * Las calculadoras ya no traen valores de ejemplo precargados: abren en blanco
   * y calculan recién cuando el usuario terminó de llenar los campos que importan.
   * completos(['#a','#b']) dice si todos esos campos (inputs numéricos; los
   * <select> siempre cuentan como completos, no pueden quedar vacíos) tienen un
   * valor utilizable.
   */
  function completos(selectors) {
    return selectors.every(s => {
      const node = $(s);
      if (!node) return false;
      if (node.tagName === 'SELECT') return true;
      return node.value !== '' && Number.isFinite(parseFloat(node.value));
    });
  }

  /** 1234.5 -> "1 234,5" con separador de miles fino */
  function fmt(v, decimals) {
    if (!Number.isFinite(v)) return '—';
    const d = decimals === undefined ? 2 : decimals;
    return v.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  const soles = (v, d) => 'S/ ' + fmt(v, d === undefined ? 2 : d);
  const pct = (v, d) => fmt(v * 100, d === undefined ? 1 : d) + ' %';

  /** Lee el valor de un token CSS del tema activo. */
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();

  /** Conecta un range con su lectura numérica y dispara onChange. */
  function bindRange(input, output, onChange, format) {
    const render = () => {
      const v = parseFloat(input.value);
      if (output) output.textContent = format ? format(v) : v;
      if (onChange) onChange(v);
    };
    input.addEventListener('input', render);
    render();
    return render;
  }

  /* ---------- gráficos SVG mínimos, dibujados a la escala ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    return n;
  }

  /**
   * Gráfico de líneas. series: [{points:[[x,y],...], color, width, dash, fill}]
   * opts: {w,h,pad,xLabel,yLabel,xTicks,yTicks,xFmt,yFmt,xMin,xMax,yMin,yMax,logX}
   */
  function lineChart(opts) {
    const o = Object.assign({ w: 640, h: 300, pad: { l: 52, r: 14, t: 12, b: 34 }, xTicks: 6, yTicks: 5, logX: false }, opts);
    const pts = o.series.flatMap(s => s.points);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const xMin = o.xMin !== undefined ? o.xMin : Math.min(...xs);
    const xMax = o.xMax !== undefined ? o.xMax : Math.max(...xs);
    let yMin = o.yMin !== undefined ? o.yMin : Math.min(...ys);
    let yMax = o.yMax !== undefined ? o.yMax : Math.max(...ys);
    if (yMin === yMax) { yMax = yMin + 1; }
    const iw = o.w - o.pad.l - o.pad.r, ih = o.h - o.pad.t - o.pad.b;
    const lx = v => o.logX ? Math.log10(Math.max(v, 1e-9)) : v;
    const X = v => o.pad.l + (lx(v) - lx(xMin)) / (lx(xMax) - lx(xMin) || 1) * iw;
    const Y = v => o.pad.t + ih - (v - yMin) / (yMax - yMin || 1) * ih;

    const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${o.w} ${o.h}`, preserveAspectRatio: 'xMidYMid meet', role: 'img' });

    const yTickVals = o.yTickVals || Array.from({ length: o.yTicks + 1 }, (_, i) => yMin + (yMax - yMin) * i / o.yTicks);
    yTickVals.forEach(v => {
      svg.appendChild(svgEl('line', { class: 'gridline', x1: o.pad.l, x2: o.w - o.pad.r, y1: Y(v), y2: Y(v) }));
      const t = svgEl('text', { x: o.pad.l - 7, y: Y(v) + 3.5, 'text-anchor': 'end' });
      t.textContent = o.yFmt ? o.yFmt(v) : fmt(v, 0);
      svg.appendChild(t);
    });
    const xTickVals = o.xTickVals || Array.from({ length: o.xTicks + 1 }, (_, i) => xMin + (xMax - xMin) * i / o.xTicks);
    xTickVals.forEach(v => {
      svg.appendChild(svgEl('line', { class: 'gridline', y1: o.pad.t, y2: o.pad.t + ih, x1: X(v), x2: X(v) }));
      const t = svgEl('text', { x: X(v), y: o.h - o.pad.b + 15, 'text-anchor': 'middle' });
      t.textContent = o.xFmt ? o.xFmt(v) : fmt(v, 0);
      svg.appendChild(t);
    });
    svg.appendChild(svgEl('line', { class: 'axis', x1: o.pad.l, x2: o.w - o.pad.r, y1: o.pad.t + ih, y2: o.pad.t + ih }));
    svg.appendChild(svgEl('line', { class: 'axis', x1: o.pad.l, x2: o.pad.l, y1: o.pad.t, y2: o.pad.t + ih }));

    o.series.forEach(s => {
      if (!s.points.length) return;
      const d = s.points.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2)).join(' ');
      if (s.fill) {
        const base = Y(clamp(0, yMin, yMax));
        svg.appendChild(svgEl('path', {
          d: d + ` L${X(s.points[s.points.length - 1][0]).toFixed(2)} ${base} L${X(s.points[0][0]).toFixed(2)} ${base} Z`,
          fill: s.fill, stroke: 'none'
        }));
      }
      svg.appendChild(svgEl('path', { d, fill: 'none', stroke: s.color || token('accent'), 'stroke-width': s.width || 2, 'stroke-dasharray': s.dash || null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      if (s.dots) s.points.forEach(p => svg.appendChild(svgEl('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.dots, fill: s.color || token('accent') })));
    });

    if (o.xLabel) { const t = svgEl('text', { x: o.pad.l + iw / 2, y: o.h - 3, 'text-anchor': 'middle' }); t.textContent = o.xLabel; svg.appendChild(t); }
    if (o.yLabel) { const t = svgEl('text', { x: 11, y: o.pad.t + ih / 2, 'text-anchor': 'middle', transform: `rotate(-90 11 ${o.pad.t + ih / 2})` }); t.textContent = o.yLabel; svg.appendChild(t); }
    return svg;
  }

  /** Barras verticales. data: [{label, value, color}] */
  function barChart(opts) {
    const o = Object.assign({ w: 640, h: 260, pad: { l: 52, r: 12, t: 12, b: 42 }, yTicks: 4 }, opts);
    const max = o.max !== undefined ? o.max : Math.max(...o.data.map(d => d.value), 1);
    const iw = o.w - o.pad.l - o.pad.r, ih = o.h - o.pad.t - o.pad.b;
    const bw = iw / o.data.length;
    const svg = svgEl('svg', { class: 'chart', viewBox: `0 0 ${o.w} ${o.h}`, preserveAspectRatio: 'xMidYMid meet', role: 'img' });
    for (let i = 0; i <= o.yTicks; i++) {
      const v = max * i / o.yTicks, y = o.pad.t + ih - ih * i / o.yTicks;
      svg.appendChild(svgEl('line', { class: 'gridline', x1: o.pad.l, x2: o.w - o.pad.r, y1: y, y2: y }));
      const t = svgEl('text', { x: o.pad.l - 7, y: y + 3.5, 'text-anchor': 'end' });
      t.textContent = o.yFmt ? o.yFmt(v) : fmt(v, 0);
      svg.appendChild(t);
    }
    o.data.forEach((d, i) => {
      const h = Math.max(1, d.value / max * ih);
      svg.appendChild(svgEl('rect', {
        x: o.pad.l + i * bw + bw * 0.18, y: o.pad.t + ih - h,
        width: bw * 0.64, height: h, rx: 2, fill: d.color || token('accent')
      }));
      const t = svgEl('text', { x: o.pad.l + i * bw + bw / 2, y: o.pad.t + ih + 15, 'text-anchor': 'middle' });
      t.textContent = d.label;
      svg.appendChild(t);
      if (o.showValues) {
        const v = svgEl('text', { x: o.pad.l + i * bw + bw / 2, y: o.pad.t + ih - h - 5, 'text-anchor': 'middle' });
        v.textContent = o.yFmt ? o.yFmt(d.value) : fmt(d.value, 0);
        svg.appendChild(v);
      }
    });
    svg.appendChild(svgEl('line', { class: 'axis', x1: o.pad.l, x2: o.w - o.pad.r, y1: o.pad.t + ih, y2: o.pad.t + ih }));
    return svg;
  }

  /** Reemplaza el contenido de un contenedor por un gráfico nuevo. */
  function draw(container, svg) { container.textContent = ''; container.appendChild(svg); return svg; }

  /* ---------- consola simulada ---------- */
  function logger(node) {
    return {
      line(text, cls) {
        const s = el('span', { class: cls || '', text: text + '\n' });
        node.appendChild(s); node.scrollTop = node.scrollHeight; return s;
      },
      html(markup) { node.insertAdjacentHTML('beforeend', markup + '\n'); node.scrollTop = node.scrollHeight; },
      clear() { node.textContent = ''; }
    };
  }

  /** Redibuja los gráficos cuando cambia el tema del visor. */
  function onThemeChange(cb) {
    if (global.matchMedia) {
      const mq = global.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener ? mq.addEventListener('change', cb) : mq.addListener(cb);
    }
    new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- selector de tema claro/oscuro ----------
     El tema real ya se fija muy pronto (script inline en <head>, antes del
     primer pintado) para no parpadear. Esto solo conecta el botón visible. */
  const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>';

  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const paint = () => {
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      btn.innerHTML = light ? ICON_MOON : ICON_SUN;
      btn.setAttribute('aria-pressed', String(light));
      btn.setAttribute('title', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
      btn.setAttribute('aria-label', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    };
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('code-theme', next); } catch (e) {}
      paint();
    });
    paint();
  }

  /* ---------- accesibilidad: anuncia resultados que cambian solos ----------
     Los paneles .readout muestran valores recalculados por el usuario
     (moviendo un slider, cambiando un select). Sin aria-live, un lector de
     pantalla nunca se entera de que el número cambió. */
  function announceReadouts() {
    $$('.readout').forEach(r => {
      if (!r.hasAttribute('aria-live')) { r.setAttribute('aria-live', 'polite'); r.setAttribute('aria-atomic', 'true'); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initThemeToggle(); announceReadouts(); });
  } else {
    initThemeToggle(); announceReadouts();
  }

  global.CODE = { $, $$, el, clamp, num, completos, fmt, soles, pct, token, bindRange, lineChart, barChart, draw, logger, onThemeChange, svgEl };
})(window);
