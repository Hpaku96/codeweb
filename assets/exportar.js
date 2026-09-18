/* CODE — exportación de resultados a CSV, XLSX, DOCX y PDF.
   Sin librerías: el .xlsx y el .docx son archivos ZIP que se arman aquí
   (con su propio CRC32 y cabeceras), y el PDF se escribe objeto por objeto.

   Cada demo declara qué exportar con CODE.exportar.registrar({...}) y esta
   barra se encarga del resto. */
(function (global) {
  'use strict';

  const { $, el } = global.CODE;

  /* ================= utilidades binarias ================= */

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

  const utf8 = s => new TextEncoder().encode(s);

  function concatenar(trozos) {
    const total = trozos.reduce((s, t) => s + t.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    trozos.forEach(t => { out.set(t, o); o += t.length; });
    return out;
  }

  const u16 = v => new Uint8Array([v & 255, (v >> 8) & 255]);
  const u32 = v => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);

  /**
   * Escribe un ZIP sin compresión (método «stored»). Es lo que necesitan
   * .xlsx y .docx: ambos son un ZIP con XML dentro.
   */
  function zip(archivos) {
    const locales = [], centrales = [];
    let offset = 0;

    archivos.forEach(({ nombre, datos }) => {
      const nombreBytes = utf8(nombre);
      const contenido = typeof datos === 'string' ? utf8(datos) : datos;
      const crc = crc32(contenido);

      const local = concatenar([
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(contenido.length), u32(contenido.length),
        u16(nombreBytes.length), u16(0), nombreBytes, contenido
      ]);
      locales.push(local);

      centrales.push(concatenar([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(contenido.length), u32(contenido.length),
        u16(nombreBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
        u32(offset), nombreBytes
      ]));
      offset += local.length;
    });

    const central = concatenar(centrales);
    const fin = concatenar([
      u32(0x06054b50), u16(0), u16(0), u16(archivos.length), u16(archivos.length),
      u32(central.length), u32(offset), u16(0)
    ]);
    return concatenar([concatenar(locales), central, fin]);
  }

  /* ================= descarga ================= */

  function descargar(nombre, datos, tipo) {
    const blob = datos instanceof Blob ? datos : new Blob([datos], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  /* ================= texto ================= */

  const escaparXml = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    // El XML 1.0 no admite caracteres de control: se quitan para no romper el archivo.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  const esNumero = v => typeof v === 'number' && Number.isFinite(v);

  /** Convierte un texto con formato local («1 234,50», «S/ 98.5 %») a número, si lo es. */
  function comoNumero(v) {
    if (esNumero(v)) return v;
    const s = String(v ?? '').trim();
    if (!s || /[a-zA-Z]{2,}/.test(s.replace(/^S\/\.?/, ''))) return null;
    const limpio = s.replace(/^S\/\.?\s*/i, '').replace(/\s/g, '').replace(/%$/, '');
    if (!/^-?[\d.,]+$/.test(limpio)) return null;
    const normal = limpio.includes(',') && !/\.\d{1,2}$/.test(limpio)
      ? limpio.replace(/\./g, '').replace(',', '.')
      : limpio.replace(/,/g, '');
    const n = parseFloat(normal);
    return Number.isFinite(n) ? n : null;
  }

  /* ================= CSV ================= */

  function aCsv(doc) {
    const lineas = [];
    const escapa = v => {
      const s = String(v ?? '');
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    lineas.push(escapa(doc.titulo));
    lineas.push(escapa(doc.fecha));
    if (doc.resumen && doc.resumen.length) {
      lineas.push('');
      lineas.push('Resumen');
      doc.resumen.forEach(r => lineas.push(escapa(r.k) + ',' + escapa(r.v)));
    }
    (doc.tablas || []).forEach(t => {
      lineas.push('');
      lineas.push(escapa(t.titulo));
      lineas.push(t.columnas.map(escapa).join(','));
      t.filas.forEach(f => lineas.push(f.map(escapa).join(',')));
    });
    // El BOM hace que Excel abra el archivo en UTF-8 sin preguntar.
    return '\ufeff' + lineas.join('\r\n');
  }

  /* ================= XLSX ================= */

  const columnaExcel = n => {
    let s = '';
    n++;
    while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; }
    return s;
  };

  function hojaXml(filas) {
    const cuerpo = filas.map((fila, r) => {
      const celdas = fila.map((celda, c) => {
        const ref = columnaExcel(c) + (r + 1);
        if (celda === null || celda === undefined || celda === '') return '';
        const estilo = celda.estilo ? ` s="${celda.estilo}"` : '';
        const valor = celda.v !== undefined ? celda.v : celda;
        const n = comoNumero(valor);
        return n !== null && !celda.texto
          ? `<c r="${ref}"${estilo}><v>${n}</v></c>`
          : `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}">${celdas}</row>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="42"/><col min="2" max="12" width="17"/></cols>
<sheetData>${cuerpo}</sheetData></worksheet>`;
  }

  function aXlsx(doc) {
    const filas = [];
    filas.push([{ v: doc.titulo, estilo: 1, texto: true }]);
    filas.push([{ v: doc.fecha, estilo: 3, texto: true }]);
    if (doc.resumen && doc.resumen.length) {
      filas.push([]);
      filas.push([{ v: 'Resumen', estilo: 2, texto: true }]);
      doc.resumen.forEach(r => filas.push([{ v: r.k, texto: true }, r.v]));
    }
    (doc.tablas || []).forEach(t => {
      filas.push([]);
      filas.push([{ v: t.titulo, estilo: 2, texto: true }]);
      filas.push(t.columnas.map(c => ({ v: c, estilo: 4, texto: true })));
      t.filas.forEach(f => filas.push(f.slice()));
    });

    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF808080"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2F3A42"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf xfId="0" fontId="0" fillId="0" borderId="0"/>
<xf xfId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/>
<xf xfId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>
<xf xfId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/>
<xf xfId="0" fontId="4" fillId="2" borderId="0" applyFont="1" applyFill="1"/>
</cellXfs></styleSheet>`;

    return zip([
      { nombre: '[Content_Types].xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>` },
      { nombre: '_rels/.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
      { nombre: 'xl/workbook.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Resultados" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { nombre: 'xl/_rels/workbook.xml.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
      { nombre: 'xl/styles.xml', datos: estilos },
      { nombre: 'xl/worksheets/sheet1.xml', datos: hojaXml(filas) }
    ]);
  }

  /* ================= DOCX ================= */

  const parrafo = (texto, opciones) => {
    const o = opciones || {};
    const props = [];
    if (o.estilo) props.push(`<w:pStyle w:val="${o.estilo}"/>`);
    if (o.espacio) props.push(`<w:spacing w:before="${o.espacio}" w:after="80"/>`);
    const runProps = [];
    if (o.negrita) runProps.push('<w:b/>');
    if (o.tam) runProps.push(`<w:sz w:val="${o.tam}"/>`);
    if (o.color) runProps.push(`<w:color w:val="${o.color}"/>`);
    return `<w:p><w:pPr>${props.join('')}</w:pPr><w:r><w:rPr>${runProps.join('')}</w:rPr>` +
      `<w:t xml:space="preserve">${escaparXml(texto)}</w:t></w:r></w:p>`;
  };

  function tablaDocx(t) {
    const celda = (texto, cabecera) =>
      `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>` +
      (cabecera ? '<w:shd w:val="clear" w:fill="2F3A42"/>' : '') +
      `</w:tcPr>${parrafo(texto, { negrita: cabecera, tam: 18, color: cabecera ? 'FFFFFF' : null })}</w:tc>`;
    const filas = [`<w:tr>${t.columnas.map(c => celda(c, true)).join('')}</w:tr>`]
      .concat(t.filas.map(f => `<w:tr>${f.map(v => celda(v, false)).join('')}</w:tr>`));
    return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>` +
      `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="C9D2D9"/>`).join('')}</w:tblBorders>` +
      `</w:tblPr>${filas.join('')}</w:tbl>`;
  }

  function aDocx(doc) {
    const cuerpo = [];
    cuerpo.push(parrafo(doc.titulo, { negrita: true, tam: 36 }));
    cuerpo.push(parrafo(doc.subtitulo || '', { tam: 20, color: '808080' }));
    cuerpo.push(parrafo(doc.fecha, { tam: 18, color: '808080' }));

    if (doc.resumen && doc.resumen.length) {
      cuerpo.push(parrafo('Resumen', { negrita: true, tam: 26, espacio: 240 }));
      cuerpo.push(tablaDocx({
        columnas: ['Concepto', 'Valor'],
        filas: doc.resumen.map(r => [r.k, r.v])
      }));
    }
    (doc.tablas || []).forEach(t => {
      cuerpo.push(parrafo(t.titulo, { negrita: true, tam: 26, espacio: 240 }));
      cuerpo.push(tablaDocx(t));
    });
    if (doc.nota) cuerpo.push(parrafo(doc.nota, { tam: 16, color: '808080', espacio: 240 }));
    cuerpo.push(parrafo('Generado con ' + (doc.origen || 'CODE'), { tam: 16, color: '808080', espacio: 240 }));

    return zip([
      { nombre: '[Content_Types].xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>` },
      { nombre: '_rels/.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>` },
      { nombre: 'word/document.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${cuerpo.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>` }
    ]);
  }

  /* ================= PDF ================= */

  /* WinAnsiEncoding: se mapea lo que las fuentes base de PDF sí saben dibujar. */
  function textoPdf(s) {
    return String(s ?? '')
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
      .replace(/\u00a0/g, ' ').replace(/[\u2212\u2012]/g, '-')
      .replace(/\u00b7/g, '-')
      .replace(/[\\()]/g, m => '\\' + m)
      .replace(/[^\x20-\x7E\xA1-\xFF]/g, '');
  }

  const ANCHO_APROX = 0.5;   // ancho medio de Helvetica en múltiplos del tamaño
  const medir = (s, tam) => textoPdf(s).length * tam * ANCHO_APROX;

  /* El PDF se escribe en WinAnsi: un byte por carácter. Codificarlo en UTF-8
     convertiría «ñ» en dos bytes y el visor mostraría «Ã±». */
  const latin1 = s => Uint8Array.from(s, c => c.charCodeAt(0) & 0xff);

  function aPdf(doc) {
    const A4 = { w: 595.28, h: 841.89 };
    const margen = 48;
    const paginas = [];
    let flujo = [], y = A4.h - margen;

    const nuevaPagina = () => { paginas.push(flujo.join('\n')); flujo = []; y = A4.h - margen; };
    const espacio = alto => { if (y - alto < margen + 30) nuevaPagina(); };

    const escribir = (texto, tam, opciones) => {
      const o = opciones || {};
      espacio(tam + 6);
      const color = o.color || '0.06 0.08 0.10';
      flujo.push(`BT /F${o.negrita ? 2 : 1} ${tam} Tf ${color} rg ${o.x || margen} ${y} Td (${textoPdf(texto)}) Tj ET`);
      y -= tam * 1.45;
    };

    const linea = () => {
      espacio(10);
      flujo.push(`0.78 0.82 0.85 RG 0.7 w ${margen} ${y + 6} m ${A4.w - margen} ${y + 6} l S`);
      y -= 8;
    };

    escribir(doc.titulo, 19, { negrita: true });
    if (doc.subtitulo) escribir(doc.subtitulo, 9.5, { color: '0.45 0.48 0.51' });
    escribir(doc.fecha, 8.5, { color: '0.45 0.48 0.51' });
    linea();

    if (doc.resumen && doc.resumen.length) {
      y -= 6;
      escribir('Resumen', 12.5, { negrita: true });
      doc.resumen.forEach(r => {
        espacio(14);
        flujo.push(`BT /F1 9.5 Tf 0.35 0.38 0.41 rg ${margen} ${y} Td (${textoPdf(r.k)}) Tj ET`);
        const valor = textoPdf(r.v);
        const x = A4.w - margen - medir(r.v, 9.5);
        flujo.push(`BT /F2 9.5 Tf 0.06 0.08 0.10 rg ${x} ${y} Td (${valor}) Tj ET`);
        y -= 14.5;
      });
      y -= 4;
    }

    (doc.tablas || []).forEach(t => {
      y -= 10;
      escribir(t.titulo, 12.5, { negrita: true });
      const util = A4.w - 2 * margen;
      const nCol = t.columnas.length;
      // La primera columna se lleva más espacio: suele ser la descripción.
      const pesos = t.columnas.map((_, i) => i === 0 ? 2.1 : 1);
      const suma = pesos.reduce((s, p) => s + p, 0);
      const anchos = pesos.map(p => p / suma * util);
      const xs = anchos.reduce((acc, a, i) => { acc.push(i ? acc[i - 1] + anchos[i - 1] : margen); return acc; }, []);

      const cabecera = () => {
        espacio(20);
        flujo.push(`0.18 0.23 0.26 rg ${margen} ${y - 4} ${util} 15 re f`);
        t.columnas.forEach((c, i) => {
          flujo.push(`BT /F2 8 Tf 1 1 1 rg ${xs[i] + 4} ${y} Td (${textoPdf(c)}) Tj ET`);
        });
        y -= 20;
      };
      cabecera();

      t.filas.forEach((fila, k) => {
        if (y - 14 < margen + 30) { nuevaPagina(); cabecera(); }
        if (k % 2 === 1) flujo.push(`0.96 0.97 0.98 rg ${margen} ${y - 4} ${util} 14 re f`);
        fila.forEach((v, i) => {
          const s = String(v ?? '');
          const numerico = comoNumero(s) !== null && i > 0;
          const x = numerico ? xs[i] + anchos[i] - 4 - medir(s, 8.5) : xs[i] + 4;
          flujo.push(`BT /F1 8.5 Tf 0.06 0.08 0.10 rg ${Math.max(xs[i] + 2, x)} ${y} Td (${textoPdf(s)}) Tj ET`);
        });
        y -= 14;
      });
      y -= 6;
    });

    if (doc.nota) { y -= 8; escribir(doc.nota, 8, { color: '0.45 0.48 0.51' }); }
    escribir('Generado con ' + (doc.origen || 'CODE'), 8, { color: '0.45 0.48 0.51' });
    nuevaPagina();

    /* --- ensamblado del archivo --- */
    const objetos = [];
    const agregar = cuerpo => { objetos.push(cuerpo); return objetos.length; };

    const idsPaginas = [];
    const idContenidos = paginas.map(p => agregar(`<< /Length ${p.length} >>\nstream\n${p}\nendstream`));
    const idFuente1 = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const idFuente2 = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const idPaginasRaiz = objetos.length + paginas.length + 1;

    paginas.forEach((_, i) => {
      idsPaginas.push(agregar(`<< /Type /Page /Parent ${idPaginasRaiz} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] ` +
        `/Resources << /Font << /F1 ${idFuente1} 0 R /F2 ${idFuente2} 0 R >> >> /Contents ${idContenidos[i]} 0 R >>`));
    });
    agregar(`<< /Type /Pages /Kids [${idsPaginas.map(i => i + ' 0 R').join(' ')}] /Count ${idsPaginas.length} >>`);
    const idCatalogo = agregar(`<< /Type /Catalog /Pages ${idPaginasRaiz} 0 R >>`);
    const idInfo = agregar(`<< /Title (${textoPdf(doc.titulo)}) /Producer (CODE) /Creator (CODE) >>`);

    let salida = '%PDF-1.4\n';
    const offsets = [0];
    objetos.forEach((cuerpo, i) => {
      offsets.push(salida.length);
      salida += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
    });
    const inicioXref = salida.length;
    salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objetos.length; i++) {
      salida += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    salida += `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\n` +
      `startxref\n${inicioXref}\n%%EOF`;
    return latin1(salida);
  }

  /* ================= barra de exportación ================= */

  let fuente = null;

  const ahora = () => new Date().toLocaleString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  function documento() {
    const d = typeof fuente === 'function' ? fuente() : fuente;
    if (!d) return null;
    return Object.assign({
      fecha: 'Generado el ' + ahora(),
      origen: 'CODE · ' + (document.title || 'portafolio'),
      archivo: (d.titulo || 'resultados').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
    }, d);
  }

  const FORMATOS = {
    csv: {
      etiqueta: 'CSV', ext: 'csv', tipo: 'text/csv;charset=utf-8',
      construir: d => aCsv(d)
    },
    xlsx: {
      etiqueta: 'Excel', ext: 'xlsx',
      tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      construir: d => aXlsx(d)
    },
    docx: {
      etiqueta: 'Word', ext: 'docx',
      tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      construir: d => aDocx(d)
    },
    pdf: {
      etiqueta: 'PDF', ext: 'pdf', tipo: 'application/pdf',
      construir: d => aPdf(d)
    }
  };

  function exportarComo(clave) {
    const d = documento();
    if (!d) return;
    const f = FORMATOS[clave];
    descargar(d.archivo + '.' + f.ext, f.construir(d), f.tipo);
    const aviso = $('#exportAviso');
    if (aviso) {
      aviso.textContent = 'Descargado ' + d.archivo + '.' + f.ext;
      aviso.className = 'chip good';
      clearTimeout(aviso._t);
      aviso._t = setTimeout(() => { aviso.textContent = ''; aviso.className = 'chip'; }, 4000);
    }
  }

  /** Construye la barra dentro del contenedor indicado (o al inicio del .wrap). */
  function montarBarra(destino) {
    const barra = el('div.export-bar', { role: 'group', 'aria-label': 'Exportar resultados' }, [
      el('span', { class: 'lbl', text: 'Exportar' })
    ]);
    Object.entries(FORMATOS).forEach(([clave, f]) => {
      barra.appendChild(el('button.sm', {
        type: 'button', text: f.etiqueta, 'data-formato': clave,
        onclick: () => exportarComo(clave)
      }));
    });
    barra.appendChild(el('span', { class: 'chip', id: 'exportAviso', 'aria-live': 'polite' }));
    if (destino) { destino.appendChild(barra); return barra; }
    // Por defecto va justo debajo del encabezado: es donde se ve sin buscarla.
    const cabecera = document.querySelector('.demo-head');
    cabecera && cabecera.parentNode
      ? cabecera.insertAdjacentElement('afterend', barra)
      : document.querySelector('.wrap').appendChild(barra);
    return barra;
  }

  /**
   * Registra qué exporta esta demo.
   * @param fn función (o objeto) que devuelve { titulo, subtitulo, resumen, tablas, nota }
   *           resumen: [{k, v}] · tablas: [{titulo, columnas, filas}]
   */
  function registrar(fn, destino) {
    fuente = fn;
    const montar = () => {
      if (document.querySelector('.export-bar')) return;
      const host = destino ? document.querySelector(destino) : null;
      montarBarra(host || document.querySelector('.wrap'));
    };
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', montar)
      : montar();
  }

  /** Lee una tabla del DOM y la convierte al formato de exportación. */
  function desdeTabla(selector, titulo) {
    const tabla = document.querySelector(selector);
    if (!tabla) return null;
    const columnas = Array.from(tabla.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const filas = Array.from(tabla.querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.children).map(td => {
        const control = td.querySelector('input, select');
        if (control) return control.type === 'checkbox' ? (control.checked ? 'sí' : 'no') : control.value;
        return td.textContent.trim();
      }));
    return { titulo: titulo || '', columnas, filas: filas.filter(f => f.some(v => v !== '')) };
  }

  /** Lee las filas de un <tbody> cuando la tabla no tiene <thead> propio. */
  function desdeTbody(selector, columnas, titulo) {
    const tb = document.querySelector(selector);
    if (!tb) return { titulo: titulo || '', columnas: columnas || [], filas: [] };
    const filas = Array.from(tb.querySelectorAll('tr'))
      .map(tr => Array.from(tr.children).map(td => {
        const control = td.querySelector('input, select');
        if (control) return control.type === 'checkbox' ? (control.checked ? 'sí' : 'no') : control.value;
        return td.textContent.trim();
      }))
      // Filas de una sola celda son encabezados de grupo dentro del cuerpo, no datos.
      .filter(f => f.length > 1 && f.some(v => v !== ''));
    return { titulo: titulo || '', columnas: columnas || [], filas };
  }

  /** Lee todas las listas de definición .kv que coincidan y las une en pares. */
  function desdeKv(selector) {
    const pares = [];
    document.querySelectorAll(selector).forEach(dl => {
      const hijos = Array.from(dl.children);
      for (let i = 0; i < hijos.length - 1; i++) {
        if (hijos[i].tagName === 'DT' && hijos[i + 1].tagName === 'DD') {
          pares.push({ k: hijos[i].textContent.trim(), v: hijos[i + 1].textContent.trim() });
        }
      }
    });
    return pares;
  }

  /** Lee los paneles .readout visibles como pares del resumen. */
  function desdeReadouts(raiz) {
    return Array.from((raiz ? document.querySelector(raiz) : document).querySelectorAll('.readout')).map(r => {
      const k = r.querySelector('.k'), v = r.querySelector('.v'), u = r.querySelector('.u');
      return {
        k: k ? k.textContent.trim() : '',
        v: (v ? v.textContent.trim() : '') + (u && u.textContent.trim() ? ' ' + u.textContent.trim() : '')
      };
    }).filter(p => p.k);
  }

  global.CODE.exportar = {
    registrar, desdeTabla, desdeTbody, desdeKv, desdeReadouts, descargar,
    aCsv, aXlsx, aDocx, aPdf, zip, crc32
  };
})(window);
