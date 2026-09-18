/* CODE — grabación de la salida de audio y exportación a WAV y MP3.

   La captura usa un ScriptProcessorNode: está marcado como obsoleto, pero es lo
   único que funciona igual en todos los navegadores sin cargar un módulo aparte
   (un AudioWorklet necesita un archivo o un blob que la política de contenido
   del sitio puede bloquear). Solo copia muestras, no procesa nada.

   El WAV se escribe aquí. El MP3 necesita un codificador: se descarga solo
   cuando el usuario pide MP3, y si no llega, se ofrece el WAV. */
(function (global) {
  'use strict';

  const TAMANO_BLOQUE = 4096;

  /* ---------- WAV ---------- */

  /** PCM de 16 bits con cabecera RIFF. */
  function aWav(canales, frecuencia) {
    const n = canales[0].length;
    const nCanales = canales.length;
    const bytes = 44 + n * nCanales * 2;
    const buffer = new ArrayBuffer(bytes);
    const v = new DataView(buffer);

    const texto = (pos, s) => { for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i)); };
    texto(0, 'RIFF');
    v.setUint32(4, bytes - 8, true);
    texto(8, 'WAVE');
    texto(12, 'fmt ');
    v.setUint32(16, 16, true);          // tamaño del bloque fmt
    v.setUint16(20, 1, true);           // PCM sin comprimir
    v.setUint16(22, nCanales, true);
    v.setUint32(24, frecuencia, true);
    v.setUint32(28, frecuencia * nCanales * 2, true);
    v.setUint16(32, nCanales * 2, true);
    v.setUint16(34, 16, true);
    texto(36, 'data');
    v.setUint32(40, n * nCanales * 2, true);

    let o = 44;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < nCanales; c++) {
        const m = Math.max(-1, Math.min(1, canales[c][i]));
        v.setInt16(o, m < 0 ? m * 0x8000 : m * 0x7fff, true);
        o += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /* ---------- MP3 ---------- */

  let cargandoLame = null;

  function cargarLame() {
    if (global.lamejs) return Promise.resolve(global.lamejs);
    if (cargandoLame) return cargandoLame;
    const fuentes = [
      'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.0/lame.min.js',
      'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js'
    ];
    cargandoLame = fuentes.reduce(
      (cadena, url) => cadena.catch(() => new Promise((ok, falla) => {
        const s = document.createElement('script');
        s.src = url;
        s.onload = () => global.lamejs ? ok(global.lamejs) : falla(new Error('codificador incompleto'));
        s.onerror = () => falla(new Error('no se pudo descargar ' + url));
        document.head.appendChild(s);
      })),
      Promise.reject(new Error('inicio'))
    );
    return cargandoLame;
  }

  const aEnteros = f => {
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      const m = Math.max(-1, Math.min(1, f[i]));
      out[i] = m < 0 ? m * 0x8000 : m * 0x7fff;
    }
    return out;
  };

  /** Codifica a MP3. Rechaza si el codificador no se pudo descargar. */
  async function aMp3(canales, frecuencia, kbps) {
    const lame = await cargarLame();
    const nCanales = canales.length;
    const codificador = new lame.Mp3Encoder(nCanales, frecuencia, kbps || 192);
    const izq = aEnteros(canales[0]);
    const der = nCanales > 1 ? aEnteros(canales[1]) : null;
    const trozos = [];
    const bloque = 1152;
    for (let i = 0; i < izq.length; i += bloque) {
      const a = izq.subarray(i, i + bloque);
      const b = der ? der.subarray(i, i + bloque) : null;
      const salida = der ? codificador.encodeBuffer(a, b) : codificador.encodeBuffer(a);
      if (salida.length) trozos.push(new Int8Array(salida));
    }
    const cola = codificador.flush();
    if (cola.length) trozos.push(new Int8Array(cola));
    return new Blob(trozos, { type: 'audio/mpeg' });
  }

  /* ---------- grabadora ---------- */

  /**
   * Engancha una grabadora a un nodo de audio.
   * @param ctx AudioContext
   * @param origen nodo cuya salida se captura (normalmente el bus maestro)
   * @returns {{iniciar, detener, grabando, duracion, exportar}}
   */
  function grabadora(ctx, origen) {
    const captura = ctx.createScriptProcessor(TAMANO_BLOQUE, 2, 2);
    const mudo = ctx.createGain();
    mudo.gain.value = 0;                 // la captura no debe sonar dos veces
    origen.connect(captura);
    captura.connect(mudo);
    mudo.connect(ctx.destination);

    let grabando = false;
    let izq = [], der = [], muestras = 0;

    captura.onaudioprocess = e => {
      if (!grabando) return;
      izq.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      der.push(new Float32Array(e.inputBuffer.getChannelData(e.inputBuffer.numberOfChannels > 1 ? 1 : 0)));
      muestras += e.inputBuffer.length;
    };

    const unir = trozos => {
      const out = new Float32Array(muestras);
      let o = 0;
      trozos.forEach(t => { out.set(t, o); o += t.length; });
      return out;
    };

    return {
      iniciar() { izq = []; der = []; muestras = 0; grabando = true; },
      detener() { grabando = false; },
      get grabando() { return grabando; },
      get duracion() { return muestras / ctx.sampleRate; },
      get vacia() { return muestras === 0; },
      canales() { return [unir(izq), unir(der)]; },
      /** @param formato 'wav' | 'mp3' */
      async exportar(formato, kbps) {
        if (!muestras) return null;
        const canales = [unir(izq), unir(der)];
        return formato === 'mp3'
          ? aMp3(canales, ctx.sampleRate, kbps)
          : aWav(canales, ctx.sampleRate);
      },
      liberar() {
        captura.onaudioprocess = null;
        try { origen.disconnect(captura); captura.disconnect(); mudo.disconnect(); } catch (e) {}
      }
    };
  }

  /* ---------- detección de tempo ---------- */

  /**
   * Estima el BPM de un AudioBuffer por autocorrelación de la envolvente de energía.
   * Devuelve { bpm, confianza, inicio } con el primer golpe fuerte en segundos.
   */
  function detectarBpm(buffer, rangoMin, rangoMax) {
    const min = rangoMin || 70, max = rangoMax || 180;
    const datos = buffer.getChannelData(0);
    const fs = buffer.sampleRate;

    // Envolvente: energía en ventanas de ~10 ms
    const ventana = Math.floor(fs * 0.01);
    const n = Math.floor(datos.length / ventana);
    const env = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < ventana; k++) { const v = datos[i * ventana + k]; s += v * v; }
      env[i] = Math.sqrt(s / ventana);
    }

    // Flujo positivo: solo interesa dónde crece la energía (los ataques)
    const flujo = new Float32Array(n);
    for (let i = 1; i < n; i++) flujo[i] = Math.max(0, env[i] - env[i - 1]);

    // Se quita la media para que la autocorrelación no la domine
    const media = flujo.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) flujo[i] -= media;

    const porVentana = 60 / 0.01;        // BPM equivalente a un desfase de 1 ventana
    const desfaseMin = Math.floor(porVentana / max);
    const desfaseMax = Math.ceil(porVentana / min);

    let mejor = desfaseMin, mejorValor = -Infinity, suma = 0, cuenta = 0;
    for (let d = desfaseMin; d <= desfaseMax && d < n; d++) {
      let c = 0;
      for (let i = 0; i + d < n; i++) c += flujo[i] * flujo[i + d];
      c /= (n - d);
      suma += c; cuenta++;
      if (c > mejorValor) { mejorValor = c; mejor = d; }
    }
    const promedio = suma / (cuenta || 1);
    const bpm = porVentana / mejor;

    // Primer ataque claro, para alinear el corte con el comienzo del compás
    const umbral = Math.max(...flujo) * 0.35;
    let inicio = 0;
    for (let i = 0; i < n; i++) if (flujo[i] > umbral) { inicio = i * 0.01; break; }

    return {
      bpm: Math.round(bpm * 10) / 10,
      confianza: promedio > 0 ? Math.min(1, mejorValor / (promedio * 6)) : 0,
      inicio
    };
  }

  /** Reajusta un BPM al rango habitual duplicándolo o partiéndolo por dos. */
  function bpmUsable(bpm, min, max) {
    let b = bpm;
    while (b < (min || 70)) b *= 2;
    while (b > (max || 180)) b /= 2;
    return Math.round(b * 10) / 10;
  }

  global.GRABAR = { grabadora, aWav, aMp3, cargarLame, detectarBpm, bpmUsable };
})(window);
