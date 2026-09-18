/* CODE — utilidades de audio compartidas por las demos de producción musical.
   El AudioContext se crea de forma perezosa: los navegadores exigen un gesto
   del usuario antes de dejar sonar nada. */
(function (global) {
  'use strict';

  let _ctx = null;
  function ctx() {
    if (!_ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      _ctx = new AC();
    }
    return _ctx;
  }
  async function resume() { const c = ctx(); if (c.state === 'suspended') await c.resume(); return c; }
  const ready = () => _ctx !== null;

  /* Ruido rosa por el método de Voss-McCartney simplificado (filtro de Paul Kellett). */
  function pinkNoise(c, segundos) {
    const n = Math.floor(c.sampleRate * (segundos || 4));
    const buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }

  /* Un loop musical sencillo: acorde con envolvente, útil para oír el efecto del proceso. */
  function loopArmonico(c, segundos) {
    const dur = segundos || 4, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(2, n, c.sampleRate);
    const notas = [110, 164.81, 220, 261.63, 329.63];
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        const paso = Math.floor(t * 2) % 4;
        const env = Math.exp(-4 * ((t * 2) % 1));
        let s = 0;
        notas.forEach((f, k) => {
          const fr = f * (paso === 2 ? 1.2 : paso === 3 ? 0.75 : 1);
          s += Math.sin(2 * Math.PI * fr * t + ch * 0.01) / (k + 2);
        });
        s += (Math.random() * 2 - 1) * 0.02;
        d[i] = s * env * 0.28;
      }
    }
    return buf;
  }

  /* Impulso sintético para la reverb por convolución. */
  function impulso(c, segundos, decaimiento, brillo) {
    const n = Math.floor(c.sampleRate * segundos);
    const buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const ruido = (Math.random() * 2 - 1) * Math.pow(1 - t, decaimiento);
        lp += (ruido - lp) * (brillo === undefined ? 0.35 : brillo);
        d[i] = lp;
      }
    }
    return buf;
  }

  /* Ajusta un canvas a su tamaño real en píxeles del dispositivo. */
  function fit(canvas, alto) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 600;
    const h = alto || 240;
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h };
  }

  const FMIN = 20, FMAX = 20000;
  const fx = (f, w, pad) => pad + (Math.log10(f / FMIN) / Math.log10(FMAX / FMIN)) * (w - 2 * pad);

  /** Rejilla logarítmica de frecuencia con escala en dB. */
  function rejilla(g, w, h, pad, dbMin, dbMax, tokens) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = tokens.surface2; g.fillRect(0, 0, w, h);
    g.strokeStyle = tokens.line; g.lineWidth = 1;
    g.font = '10px ui-monospace, monospace'; g.fillStyle = tokens.muted;
    [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].forEach(f => {
      const x = fx(f, w, pad);
      g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h - 18); g.stroke();
      g.textAlign = 'center';
      g.fillText(f >= 1000 ? (f / 1000) + 'k' : String(f), x, h - 5);
    });
    const paso = (dbMax - dbMin) / 6;
    for (let db = dbMin; db <= dbMax + 0.01; db += paso) {
      const y = 8 + (dbMax - db) / (dbMax - dbMin) * (h - 26);
      g.beginPath(); g.moveTo(pad, y); g.lineTo(w - pad, y); g.stroke();
      g.textAlign = 'left';
      g.fillText((db > 0 ? '+' : '') + db.toFixed(0), 3, y + 3);
    }
  }

  /** Lee los colores del tema para dibujar en canvas. */
  function tokens() {
    const s = getComputedStyle(document.documentElement);
    const t = n => s.getPropertyValue('--' + n).trim();
    return { ink: t('ink'), muted: t('muted'), line: t('line-soft'), accent: t('accent'), blue: t('blue'), surface2: t('surface-2'), good: t('good'), bad: t('bad') };
  }

  const notaAFrec = n => 440 * Math.pow(2, (n - 69) / 12);
  const NOMBRES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  const nombreNota = n => NOMBRES[n % 12] + (Math.floor(n / 12) - 1);

  global.AUDIO = { ctx, resume, ready, pinkNoise, loopArmonico, impulso, fit, fx, rejilla, tokens, notaAFrec, nombreNota, FMIN, FMAX };
})(window);
