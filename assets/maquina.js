/* CODE — piezas de la máquina: chasis, perillas, pads, botones, testigos y pantalla.
   Los controles se manejan con ratón, dedo y teclado; la perilla gira 270° entre
   su mínimo y su máximo, como una de verdad. */
(function (global) {
  'use strict';

  const { el } = global.CODE;
  const NS = 'http://www.w3.org/2000/svg';
  const lim = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- chasis ---------- */

  /**
   * Arma la carcasa completa.
   * @returns {{maquina, cabecera, panel, pie}} nodos donde colgar los módulos.
   */
  function chasis(opciones) {
    const o = opciones || {};
    const cabecera = el('div.maquina-cabecera', null, [
      el('span.maquina-marca', { text: o.marca || 'CODE' }),
      el('span.maquina-modelo', { text: o.modelo || '' })
    ]);
    if (o.derecha) cabecera.appendChild(el('div.maquina-derecha', null, o.derecha));

    const panel = el('div.maquina-panel' + (o.unaColumna ? '.una' : ''));
    const pie = el('div.maquina-pie', null, o.pie || []);
    const cuerpo = el('div.maquina-cuerpo', null, [cabecera, panel, pie]);
    const maquina = el('div.maquina', { role: 'group', 'aria-label': o.modelo || 'Máquina' }, cuerpo);
    return { maquina, cabecera, panel, pie };
  }

  /**
   * Un módulo del panel, con su rótulo grabado.
   * @param ancho clase de anchura en la rejilla de doce columnas ('sp4', 'sp5'…);
   *              sin ella ocupa todo el ancho.
   */
  function modulo(titulo, contenido, ancho) {
    const m = el('section.modulo' + (ancho ? '.' + ancho : ''), null, [el('h3', { text: titulo })]);
    (Array.isArray(contenido) ? contenido : [contenido]).forEach(c => c && m.appendChild(c));
    return m;
  }

  /* ---------- perilla ---------- */

  const GIRO = 135;   // grados a cada lado del centro

  function arco(tam) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'perilla-arco');
    svg.setAttribute('viewBox', '0 0 100 100');
    const camino = (desde, hasta, color, ancho) => {
      const p = document.createElementNS(NS, 'path');
      const pol = a => {
        const r = (a - 90) * Math.PI / 180;
        return [50 + 44 * Math.cos(r), 50 + 44 * Math.sin(r)];
      };
      const [x1, y1] = pol(desde), [x2, y2] = pol(hasta);
      const largo = Math.abs(hasta - desde) > 180 ? 1 : 0;
      p.setAttribute('d', `M${x1.toFixed(2)} ${y1.toFixed(2)} A44 44 0 ${largo} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', ancho);
      p.setAttribute('stroke-linecap', 'round');
      return p;
    };
    const fondo = camino(-GIRO, GIRO, 'rgba(255,252,244,.14)', 3);
    svg.appendChild(fondo);
    const activo = camino(-GIRO, -GIRO + 0.01, '#e7b93d', 3);
    svg.appendChild(activo);
    return { svg, actualizar: t => {
      const hasta = -GIRO + t * GIRO * 2;
      const nuevo = camino(-GIRO, Math.max(-GIRO + 0.01, hasta), '#e7b93d', 3);
      activo.setAttribute('d', nuevo.getAttribute('d'));
    } };
  }

  /**
   * Perilla giratoria.
   * @param o {nombre, min, max, valor, paso, formato, log, chica, onCambio}
   * @returns el elemento, con .obtener() y .fijar(v)
   */
  function perilla(o) {
    const min = o.min, max = o.max;
    const log = !!o.log;
    const aNorm = v => log
      ? (Math.log(lim(v, min, max)) - Math.log(min)) / (Math.log(max) - Math.log(min))
      : (lim(v, min, max) - min) / (max - min);
    const deNorm = t => log
      ? Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)))
      : min + t * (max - min);

    let valor = o.valor !== undefined ? o.valor : min;
    const inicial = valor;

    const disco = el('div.perilla-disco', {
      role: 'slider', tabindex: '0',
      'aria-label': o.nombre,
      'aria-valuemin': String(min), 'aria-valuemax': String(max)
    });
    const a = arco();
    disco.appendChild(a.svg);
    const lectura = el('span.perilla-valor');
    const caja = el('div.perilla' + (o.chica ? '.chica' : ''), null, [
      disco,
      el('span.perilla-nombre', { text: o.nombre }),
      lectura
    ]);

    const formato = o.formato || (v => v.toFixed(2));

    function pintar(avisar) {
      const t = aNorm(valor);
      disco.style.transform = `rotate(${(-GIRO + t * GIRO * 2).toFixed(2)}deg)`;
      a.svg.style.transform = `rotate(${(GIRO - t * GIRO * 2).toFixed(2)}deg)`;   // el arco no gira con la perilla
      a.actualizar(t);
      lectura.textContent = formato(valor);
      disco.setAttribute('aria-valuenow', String(Math.round(valor * 1000) / 1000));
      disco.setAttribute('aria-valuetext', formato(valor));
      if (avisar && o.onCambio) o.onCambio(valor);
    }

    function fijar(v, avisar) {
      const paso = o.paso || 0;
      let nuevo = lim(v, min, max);
      if (paso) nuevo = Math.round(nuevo / paso) * paso;
      valor = lim(nuevo, min, max);
      pintar(avisar !== false);
    }

    /* Arrastre vertical: 180 px recorren todo el rango; con Shift, la décima parte. */
    disco.addEventListener('pointerdown', e => {
      e.preventDefault();
      disco.setPointerCapture(e.pointerId);
      const y0 = e.clientY, t0 = aNorm(valor);
      const mover = ev => {
        const fino = ev.shiftKey ? 0.1 : 1;
        fijar(deNorm(lim(t0 + (y0 - ev.clientY) / 180 * fino, 0, 1)));
      };
      const soltar = () => {
        disco.removeEventListener('pointermove', mover);
        disco.removeEventListener('pointerup', soltar);
        disco.removeEventListener('pointercancel', soltar);
      };
      disco.addEventListener('pointermove', mover);
      disco.addEventListener('pointerup', soltar);
      disco.addEventListener('pointercancel', soltar);
    });

    disco.addEventListener('dblclick', () => fijar(inicial));

    disco.addEventListener('wheel', e => {
      e.preventDefault();
      const paso = (e.shiftKey ? 0.004 : 0.03) * (e.deltaY > 0 ? -1 : 1);
      fijar(deNorm(lim(aNorm(valor) + paso, 0, 1)));
    }, { passive: false });

    disco.addEventListener('keydown', e => {
      const grande = e.key === 'PageUp' || e.key === 'PageDown';
      const arriba = e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'PageUp';
      const abajo = e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'PageDown';
      if (e.key === 'Home') { fijar(min); e.preventDefault(); return; }
      if (e.key === 'End') { fijar(max); e.preventDefault(); return; }
      if (!arriba && !abajo) return;
      e.preventDefault();
      const d = (grande ? 0.1 : 0.02) * (arriba ? 1 : -1);
      fijar(deNorm(lim(aNorm(valor) + d, 0, 1)));
    });

    caja.obtener = () => valor;
    caja.fijar = (v, avisar) => fijar(v, avisar);
    pintar(false);
    return caja;
  }

  /* ---------- botón ---------- */

  function boton(o) {
    const tapa = el('span.tapa', { text: o.texto });
    const b = el('button.btn-maquina', {
      type: 'button',
      'aria-label': o.etiqueta || o.texto,
      title: o.titulo || ''
    }, [tapa]);
    if (o.pie) b.appendChild(el('span.pie', { text: o.pie }));
    if (o.alternar) b.setAttribute('aria-pressed', String(!!o.activo));
    if (o.activo && !o.alternar) b.classList.add('activo');
    b.addEventListener('click', () => {
      if (o.alternar) {
        const nuevo = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(nuevo));
        o.onClick && o.onClick(nuevo);
      } else {
        o.onClick && o.onClick();
      }
    });
    b.texto = t => { tapa.textContent = t; };
    b.encender = v => {
      o.alternar ? b.setAttribute('aria-pressed', String(v)) : b.classList.toggle('activo', !!v);
    };
    return b;
  }

  /** Botón que abre un selector de archivos sin romper el aspecto del panel. */
  function botonArchivo(o) {
    const entrada = el('input', { type: 'file', accept: o.accept || 'audio/*', id: o.id || ('arch' + Math.random().toString(36).slice(2, 8)) });
    if (o.multiple) entrada.multiple = true;
    entrada.addEventListener('change', e => { o.onArchivo && o.onArchivo(e.target.files); entrada.value = ''; });
    const etiqueta = el('label.archivo-maquina', { for: entrada.id }, [
      el('span.tapa', { text: o.texto }),
      o.pie ? el('span.pie', { text: o.pie }) : null
    ]);
    const caja = el('span', { style: 'display:inline-block' }, [entrada, etiqueta]);
    return caja;
  }

  /* ---------- testigos y pantalla ---------- */

  function led(rotulo, clase) {
    const luz = el('i.led' + (clase ? '.' + clase : ''));
    const caja = el('span.led-rotulo', null, [luz, rotulo || '']);
    caja.encender = v => luz.classList.toggle('on', !!v);
    caja.luz = luz;
    return caja;
  }

  function lcd(alto) {
    const p = el('div.lcd', alto ? { style: 'min-height:' + alto + 'px' } : null);
    p.escribir = html => { p.innerHTML = html; };
    return p;
  }

  /** Medidor de barras; nivel en dBFS (−60 a 0). */
  function medidor(n) {
    const barras = [];
    const caja = el('div.medidor-barras', { 'aria-hidden': 'true' });
    const total = n || 14;
    for (let i = 0; i < total; i++) {
      const b = el('i');
      barras.push(b);
      caja.appendChild(b);
    }
    caja.nivel = db => {
      const t = lim((db + 60) / 60, 0, 1);
      const encendidas = Math.round(t * total);
      barras.forEach((b, i) => {
        b.className = '';
        if (i >= encendidas) return;
        b.classList.add(i >= total - 2 ? 'pico' : i >= total - 5 ? 'alto' : 'on');
      });
    };
    caja.nivel(-60);
    return caja;
  }

  /* ---------- pads ---------- */

  function pad(o) {
    const b = el('button.pad', {
      type: 'button',
      'data-pad': o.indice,
      'aria-label': 'Pad ' + (o.indice + 1) + (o.nombre ? ': ' + o.nombre : '')
    }, [
      el('span.pad-num', { text: String(o.indice + 1).padStart(2, '0') }),
      el('span.pad-nombre', { text: o.nombre || '—' }),
      el('span.pad-fuente', { text: o.fuente || '' })
    ]);
    const golpear = e => {
      if (e) e.preventDefault();
      o.onGolpe && o.onGolpe();
      b.classList.add('golpeado');
      setTimeout(() => b.classList.remove('golpeado'), 110);
    };
    b.addEventListener('pointerdown', golpear);
    b.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); golpear(); }
    });
    b.renombrar = (nombre, fuente) => {
      b.querySelector('.pad-nombre').textContent = nombre || '—';
      b.querySelector('.pad-fuente').textContent = fuente || '';
      b.setAttribute('aria-label', 'Pad ' + (o.indice + 1) + (nombre ? ': ' + nombre : ''));
    };
    b.destellar = () => { b.classList.add('golpeado'); setTimeout(() => b.classList.remove('golpeado'), 110); };
    return b;
  }

  /* ---------- módulo de grabación ---------- */

  /**
   * Módulo de grabar y exportar, igual en todas las máquinas que procesan audio.
   * @param o {prefijo, ancho, preparar} donde `preparar` devuelve la grabadora
   *          ya enganchada a la salida (creándola si hace falta).
   */
  function grabacion(o) {
    let grabando = false, ultima = 0, grabadora = null;
    const luz = led('Rec', 'rojo');
    const lectura = el('span.pie', { text: 'sin toma' });

    const btnWav = boton({ texto: 'WAV', onClick: () => exportar('wav') });
    const btnMp3 = boton({ texto: 'MP3', pie: '192 kbps', onClick: () => exportar('mp3') });
    btnWav.disabled = btnMp3.disabled = true;

    const btnRec = boton({
      texto: '● Rec',
      onClick: async () => {
        grabadora = await o.preparar();
        if (!grabadora) return;
        if (!grabando) {
          grabadora.iniciar();
          grabando = true;
          btnRec.encender(true); luz.encender(true);
          lectura.textContent = 'grabando…';
        } else {
          grabadora.detener();
          grabando = false;
          ultima = grabadora.duracion;
          btnRec.encender(false); luz.encender(false);
          btnWav.disabled = btnMp3.disabled = false;
          lectura.textContent = ultima.toFixed(1) + ' s capturados';
        }
      }
    });

    async function exportar(formato) {
      if (!grabadora || grabadora.vacia) return;
      const b = formato === 'mp3' ? btnMp3 : btnWav;
      const etiqueta = formato === 'mp3' ? 'MP3' : 'WAV';
      b.texto('…');
      try {
        const blob = await grabadora.exportar(formato, 192);
        global.CODE.exportar.descargar((o.prefijo || 'code') + '-' + Date.now() + '.' + formato, blob);
        lectura.textContent = 'exportado ' + etiqueta;
      } catch (e) {
        lectura.textContent = 'sin codificador MP3: usa WAV';
      }
      b.texto(etiqueta);
    }

    const fila = el('div.fila-botones', null, [btnRec, btnWav, btnMp3]);
    const pie = el('div', { style: 'display:flex;align-items:center;gap:10px;margin-top:10px' }, [luz, lectura]);
    return { modulo: modulo('Grabación', [fila, pie], o.ancho), luz };
  }

  global.MAQUINA = { chasis, modulo, perilla, boton, botonArchivo, led, lcd, medidor, pad, grabacion };
})(window);
