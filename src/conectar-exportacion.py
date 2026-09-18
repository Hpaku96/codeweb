#!/usr/bin/env python3
"""Inserta el registro de exportación al final del script de cada demo.

Utilidad de un solo uso: una vez aplicada, el bloque vive en el fragmento
correspondiente de src/pages/ y se edita ahí como cualquier otro código.
"""
import pathlib
import sys

PAGES = pathlib.Path(__file__).resolve().parent / 'pages'

BLOQUES = {
'02-granulometria.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Análisis granulométrico y clasificación de suelos',
  subtitulo: 'Curva granulométrica, diámetros característicos y doble clasificación',
  resumen: X.desdeReadouts().concat(X.desdeKv('.kv')),
  tablas: [Object.assign(X.desdeTabla('#tamices'), { titulo: 'Pesos retenidos por tamiz' })],
  nota: 'Los diámetros D10, D30 y D60 se interpolan en escala logarítmica sobre la curva del ensayo.'
}));
""",

'03-vigas-diagramas.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Diagramas de cortante y momento',
  subtitulo: 'Viga de ' + $('#L').value + ' m · ' + $('#tipo').selectedOptions[0].textContent,
  resumen: X.desdeReadouts().concat(X.desdeKv('.kv')),
  tablas: [
    Object.assign(X.desdeTabla('#cargas'), { titulo: 'Cargas aplicadas' }),
    {
      titulo: 'Cortante y momento cada 0.25 m',
      columnas: ['x (m)', 'V (t)', 'M (t·m)'],
      filas: estaciones()
    }
  ],
  nota: 'V(x) y M(x) se integran numéricamente sobre 600 estaciones; la tabla muestra una de cada veinticinco.'
}));
""",

'04-mezcla-concreto.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: "Diseño de mezcla de concreto f'c = " + $('#fc').value + ' kg/cm²',
  subtitulo: 'Método del volumen absoluto, ACI 211.1',
  resumen: X.desdeReadouts().concat([
    { k: 'Bolsas por m³', v: $('#bolsas').textContent },
    { k: 'Aire y agua de obra', v: $('#rend').textContent }
  ]),
  tablas: [X.desdeTbody('#dosif', ['Material', 'Diseño (kg)', 'Obra (kg)', 'Proporción'], 'Dosificación por metro cúbico')],
  nota: 'La columna «obra» ya incorpora la corrección por humedad y absorción de los agregados.'
}));
""",

'05-proctor-cbr.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Proctor modificado y ensayo CBR',
  subtitulo: 'Curva de compactación y resistencia a la penetración',
  resumen: X.desdeReadouts().concat([{ k: 'Conformidad del ensayo', v: $('#aviso').textContent }]),
  tablas: [
    Object.assign(X.desdeTabla('#tProctor'), { titulo: 'Puntos del ensayo Proctor' }),
    Object.assign(X.desdeTabla('#tCbr'), { titulo: 'Curva esfuerzo / penetración' })
  ],
  nota: 'La densidad máxima y el óptimo de humedad salen del vértice de la parábola ajustada por mínimos cuadrados.'
}));
""",

'06-conversor-unidades.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Conversión de unidades · ' + NOMBRES[cat],
  subtitulo: $('#val').value + ' ' + (CAT[cat].unidades[+$('#uni').value] || [])[1],
  resumen: X.desdeReadouts(),
  tablas: [X.desdeTbody('#tabla', ['Unidad', 'Valor', 'Símbolo'], 'Equivalencias')],
  nota: 'La temperatura se convierte con una transformación afín; el resto, por factor respecto a la unidad base del SI.'
}));
""",

'07-presupuesto-obra.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Presupuesto de obra',
  subtitulo: partidas.length + ' partidas · análisis de precios unitarios',
  resumen: X.desdeKv('.kv').concat(X.desdeReadouts()),
  tablas: [
    Object.assign(X.desdeTabla('#tPartidas'), { titulo: 'Partidas del presupuesto' }),
    Object.assign(X.desdeTabla('#tApu'), { titulo: 'APU · ' + partidas[sel].item + ' ' + partidas[sel].desc })
  ],
  nota: 'La mano de obra sale de cuadrilla × 8 / rendimiento; las herramientas manuales, como porcentaje de la mano de obra.'
}));
""",

'08-poligonal-topografia.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Cierre y compensación de poligonal',
  subtitulo: lados.length + ' lados · compensación por el método de la brújula',
  resumen: X.desdeReadouts().concat(X.desdeKv('.kv'), [{ k: 'Veredicto', v: $('#verdict').textContent }]),
  tablas: [
    Object.assign(X.desdeTabla('#tLados'), { titulo: 'Lados de la poligonal' }),
    Object.assign(X.desdeTabla('#tCoord'), { titulo: 'Coordenadas compensadas' })
  ],
  nota: 'El área se calcula por la fórmula de Gauss sobre las coordenadas ya compensadas.'
}));
""",

'15-catalogo-cotizador.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Cotización · ' + $('#cliente').value,
  subtitulo: 'Precios en soles, con escala por volumen',
  resumen: X.desdeKv('.kv').concat(X.desdeReadouts()),
  tablas: [{
    titulo: 'Detalle de la cotización',
    columnas: ['SKU', 'Producto', 'Cantidad', 'P. unitario', 'Importe'],
    filas: lineas().map(i => [i.p.sku, i.p.nombre + ' · ' + i.p.presentacion, i.cant, fmt(i.unit, 2), fmt(i.importe, 2)])
  }],
  nota: 'Validez de la oferta: 15 días. Catálogo y cliente son datos de ejemplo.'
}));
""",

'16-crm-clientes.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Cartera de clientes y prospectos',
  subtitulo: visibles().length + ' de ' + cartera.length + ' cuentas en la vista actual',
  resumen: X.desdeReadouts(),
  tablas: [{
    titulo: 'Cartera',
    columnas: ['Cliente', 'Tipo', 'Distrito', 'Vendedor', 'Etapa', 'Ticket', 'Frecuencia (d)', 'Días sin comprar', 'Visita'],
    filas: visibles().map(c => [c.nombre, c.tipo, c.distrito, c.vendedor, c.etapa,
      c.ticket ? fmt(c.ticket, 2) : '', c.frecuencia || '', c.frecuencia ? c.ultima : '',
      c.frecuencia ? (vencida(c) ? 'vencida' : 'al día') : 'por programar'])
  }],
  nota: 'Datos sintéticos de demostración.'
}));
""",

'17-optimizador-rutas.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Hoja de ruta de reparto',
  subtitulo: seleccion.size + ' paradas · salida 08:00 desde ' + ALMACEN.nombre,
  resumen: X.desdeReadouts().concat(X.desdeKv('.kv')),
  tablas: [X.desdeTbody('#hoja', ['#', 'Parada', 'Tramo (km)', 'Acumulado (km)', 'Llegada'], 'Orden de visita')],
  nota: 'Las distancias aplican un factor de trama urbana sobre la distancia en línea recta.'
}));
""",

'18-simulador-credito.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Simulación de crédito',
  subtitulo: soles(num($('#monto').value, 0)) + ' a ' + $('#n').value + ' meses · ' +
    $('#sistema').selectedOptions[0].textContent,
  resumen: X.desdeReadouts().concat(X.desdeKv('.kv')),
  tablas: [{
    titulo: 'Cronograma de pagos',
    columnas: ['N°', 'Saldo inicial', 'Interés', 'Amortización', 'Seguro y portes', 'Cuota', 'Saldo final'],
    filas: cronograma().filas.map(r => [r.k, fmt(r.ini, 2), fmt(r.interes, 2), fmt(r.amort, 2), fmt(r.cargo, 2), fmt(r.cuota, 2), fmt(r.fin, 2)])
  }],
  nota: 'Herramienta de cálculo con fines de demostración; no sustituye la hoja resumen de la entidad financiera.'
}));
""",

'19-panel-ventas.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Panel de ventas',
  subtitulo: ($('#vend').value || 'Todos los vendedores') + ' · ' + ($('#linea').value || 'Todas las líneas') +
    ' · ' + $('#periodo').selectedOptions[0].textContent,
  resumen: X.desdeReadouts(),
  tablas: [
    { titulo: 'Venta y margen por mes', columnas: ['Mes', 'Venta', 'Margen'],
      filas: MESES.map((mes, m) => {
        const f = filtrar().filter(d => d.m === m);
        return f.length ? [mes, f.reduce((s, d) => s + d.monto, 0), f.reduce((s, d) => s + d.margen, 0)] : null;
      }).filter(Boolean) },
    X.desdeTbody('#rank', ['Vendedor', 'Venta', 'Margen', 'Participación'], 'Ranking de vendedores')
  ].filter(t => t.filas.length),
  nota: 'Series de venta sintéticas generadas con semilla fija.'
}));
""",

'20-control-inventario.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Control de inventario y reposición',
  subtitulo: 'Plazo de entrega ' + $('#lt').value + ' días · nivel de servicio ' +
    $('#servicio').selectedOptions[0].textContent,
  resumen: X.desdeReadouts(),
  tablas: [{
    titulo: 'Situación por producto',
    columnas: ['SKU', 'Producto', 'Stock', 'Demanda diaria', 'Cobertura (d)', 'Punto de reorden', 'Lote económico', 'Pedir', 'Estado'],
    filas: analizar().sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.cobertura - b.cobertura)
      .map(f => [f.p.sku, f.p.nombre, fmt(f.p.stock, 0), fmt(f.d, 2),
        Number.isFinite(f.cobertura) ? fmt(f.cobertura, 0) : '', fmt(f.rop, 1), fmt(f.eoq, 1),
        f.pedir ? fmt(f.pedir, 0) : '', ETIQUETA[f.estado][1]])
  }],
  nota: 'El stock de seguridad usa el factor z del nivel de servicio y la variabilidad declarada de la demanda.'
}));
""",

'21-punto-de-venta.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Pre-cuenta · Mesa ' + mesaActiva,
  subtitulo: mesa().lineas.reduce((s, l) => s + l.cant, 0) + ' ítems · ' + $('#comensales').value + ' comensales',
  resumen: X.desdeKv('.kv').concat(X.desdeReadouts()),
  tablas: [{
    titulo: 'Comanda',
    columnas: ['Ítem', 'Nota', 'Cantidad', 'P. unitario', 'Importe'],
    filas: mesa().lineas.map(l => [l.nombre, l.nota, l.cant, fmt(l.precio, 2), fmt(l.precio * l.cant, 2)])
  }],
  nota: 'Pre-cuenta de demostración. No reemplaza el comprobante de pago electrónico del negocio.'
}));
""",

'22-margenes-precios.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Márgenes, precios y punto de equilibrio',
  subtitulo: 'Costo de compra ' + soles(num($('#costo').value, 0)) + ' por unidad',
  resumen: X.desdeReadouts().concat(X.desdeKv('.kv')),
  tablas: [X.desdeTbody('#canales', ['Canal', 'Margen objetivo', 'Precio sin IGV', 'Precio con IGV', 'Contribución'], 'Lista de precios por canal')],
  nota: 'Precio = costo real ÷ (1 − margen − comisión). El costo real ya incluye flete y merma.'
}));
""",

'23-api-rest-consola.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Bitácora de peticiones a la API',
  subtitulo: historial.length + ' peticiones en esta sesión',
  resumen: [
    { k: 'Última petición', v: historial.length ? historial[0].metodo + ' ' + historial[0].ruta : '—' },
    { k: 'Último estado', v: $('#estado').textContent },
    { k: 'Tiempo de respuesta', v: $('#tiempo').textContent },
    { k: 'Tamaño de la respuesta', v: $('#tam').textContent }
  ],
  tablas: [{
    titulo: 'Historial',
    columnas: ['Método', 'Ruta', 'Estado', 'ms'],
    filas: historial.map(h => [h.metodo, h.ruta, h.estado, fmt(h.ms, 1)])
  }],
  nota: 'El servidor corre íntegramente en el navegador; los datos son sintéticos.'
}));
""",

'24-disenador-esquema.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Esquema de base de datos',
  subtitulo: $('#resumen').textContent + ' · dialecto ' + $('#dialecto').selectedOptions[0].textContent,
  resumen: [
    { k: 'Tablas', v: esquema.length },
    { k: 'Campos', v: esquema.reduce((s, t) => s + t.campos.length, 0) },
    { k: 'Claves foráneas', v: esquema.reduce((s, t) => s + t.campos.filter(c => c.ref).length, 0) }
  ],
  tablas: [{
    titulo: 'Diccionario de datos',
    columnas: ['Tabla', 'Campo', 'Tipo', 'Clave primaria', 'Admite nulo', 'Referencia'],
    filas: esquema.flatMap(t => t.campos.map(c =>
      [t.nombre, c.n, c.t, c.pk ? 'sí' : '', c.nulo ? 'sí' : '', c.ref || '']))
  }],
  nota: 'El SQL completo se genera en la propia herramienta; aquí va el diccionario del modelo.'
}));
""",

'25-motor-sql.html': """
const X = CODE.exportar;
X.registrar(() => {
  let filas = [], columnas = [];
  try {
    const r = ejecutar(parse(lex($('#sql').value)));
    columnas = r.length ? Object.keys(r[0]) : [];
    filas = r.map(f => columnas.map(c => f[c] === null || f[c] === undefined ? '' : f[c]));
  } catch (e) { /* si la consulta no compila, se exporta solo el enunciado */ }
  return {
    titulo: 'Resultado de la consulta',
    subtitulo: filas.length + ' filas devueltas',
    resumen: [
      { k: 'Estado', v: $('#estado').textContent },
      { k: 'Tiempo de ejecución', v: $('#tiempo').textContent },
      { k: 'Consulta', v: $('#sql').value.replace(/\\s+/g, ' ').slice(0, 300) }
    ],
    tablas: filas.length ? [{ titulo: 'Filas', columnas, filas }] : [],
    nota: 'Consulta resuelta por el intérprete SQL incluido en la página.'
  };
});
""",

'26-pipeline-etl.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Resultado del pipeline ETL',
  subtitulo: limpio.length + ' registros válidos · ' + rechazos.length + ' rechazados',
  resumen: [
    { k: 'Registros cargados', v: limpio.length },
    { k: 'Registros rechazados', v: rechazos.length },
    { k: 'Valorizado total', v: fmt(limpio.reduce((s, f) => s + f.valorizado, 0), 2) }
  ],
  tablas: [
    limpio.length ? { titulo: 'Registros limpios', columnas: Object.keys(limpio[0]), filas: limpio.map(f => Object.values(f)) } : null,
    rechazos.length ? { titulo: 'Rechazos', columnas: ['Línea', 'SKU', 'Motivos'], filas: rechazos.map(r => [r.__linea, r.sku || '', r.motivos.join(' · ')]) } : null
  ].filter(Boolean),
  nota: 'Cada rechazo indica la línea del archivo original y todas las reglas que incumplió.'
}));
""",

'27-jwt-autenticacion.html': """
const X = CODE.exportar;
X.registrar(() => {
  const partes = $('#entrada').value.trim().split('.');
  let carga = {};
  try { carga = JSON.parse(textoDe(deB64url(partes[1]))); } catch (e) { /* token ilegible */ }
  return {
    titulo: 'Verificación de token JWT',
    subtitulo: 'Algoritmo HS256 · firma y vigencia comprobadas en el navegador',
    resumen: Array.from(document.querySelectorAll('#chips .chip')).map((c, i) => ({ k: 'Comprobación ' + (i + 1), v: c.textContent })),
    tablas: [{
      titulo: 'Claims del token',
      columnas: ['Claim', 'Valor'],
      filas: Object.entries(carga).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)])
    }],
    nota: 'El token y el secreto son de demostración: no dan acceso a ningún servicio real.'
  };
});
""",

'28-generador-datos.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Datos de prueba · ' + $('#entidad').selectedOptions[0].textContent,
  subtitulo: registros.length + ' registros con semilla ' + $('#semilla').value,
  resumen: [
    { k: 'Entidad', v: $('#entidad').selectedOptions[0].textContent },
    { k: 'Registros', v: registros.length },
    { k: 'Semilla', v: $('#semilla').value },
    { k: 'Campos', v: columnas().join(', ') }
  ],
  tablas: [{ titulo: 'Registros', columnas: columnas(), filas: registros.map(r => columnas().map(c => r[c])) }],
  nota: 'Datos sintéticos: nombres, negocios y correos son inventados y no corresponden a personas reales.'
}));
""",

'29-monitor-logs.html': """
const X = CODE.exportar;
X.registrar(() => {
  const minuto = eventos.filter(e => e.t > Date.now() - 60000);
  return {
    titulo: 'Reporte de observabilidad',
    subtitulo: minuto.length + ' eventos en el último minuto · ' + $('#estadoGlobal').textContent,
    resumen: X.desdeReadouts(),
    tablas: [
      { titulo: 'Estado por servicio', columnas: ['Servicio', 'Peticiones', 'Errores', 'p99 (ms)'],
        filas: SERVICIOS.map(s => {
          const suyos = minuto.filter(e => e.servicio === s.nombre);
          return [s.nombre, suyos.length, suyos.filter(e => e.nivel === 'error').length, fmt(percentil(suyos.map(e => e.ms), 0.99), 0)];
        }) },
      { titulo: 'Eventos recientes', columnas: ['Hora', 'Nivel', 'Servicio', 'Ruta', 'Estado', 'ms', 'Mensaje', 'Traza'],
        filas: eventos.slice(-200).reverse().map(e => [
          new Date(e.t).toLocaleTimeString('es-PE', { hour12: false }), e.nivel, e.servicio, e.ruta, e.estado, e.ms, e.mensaje, e.traza]) }
    ],
    nota: 'Flujo de eventos simulado para demostrar el panel.'
  };
});
""",

'30-sistema-de-color.html': """
const X = CODE.exportar;
X.registrar(() => ({
  titulo: 'Sistema de color',
  subtitulo: 'Matiz ' + $('#matiz').value + '° · croma ' + $('#croma').value + ' · ' + $('#pasos').selectedOptions[0].textContent,
  resumen: [
    { k: 'Color de marca', v: $('#hex').value },
    { k: 'Escalas generadas', v: Object.keys(paletas).join(', ') },
    { k: 'Pasos por escala', v: paletas.marca.length }
  ],
  tablas: [{
    titulo: 'Tokens de color',
    columnas: ['Token', 'Hex', 'Contraste vs blanco', 'Contraste vs negro', 'Nivel WCAG'],
    filas: Object.entries(paletas).flatMap(([nombre, pasos]) => pasos.map(p => {
      const cb = contraste(p.hex, '#ffffff'), cn = contraste(p.hex, '#111111');
      return [nombre + '-' + p.n, p.hex, fmt(cb, 2), fmt(cn, 2), nivel(Math.max(cb, cn))];
    }))
  }],
  nota: 'Las escalas se construyen en OKLCH y se recortan al gamut sRGB bajando el croma.'
}));
"""
}


def main():
    cambiados = []
    for nombre, bloque in BLOQUES.items():
        ruta = PAGES / nombre
        if not ruta.exists():
            print('falta', nombre, file=sys.stderr)
            continue
        texto = ruta.read_text(encoding='utf-8')
        if 'CODE.exportar.registrar' in texto or 'X.registrar' in texto:
            continue
        corte = texto.rstrip().rfind('</script>')
        if corte < 0:
            print('sin <script> final:', nombre, file=sys.stderr)
            continue
        nuevo = texto[:corte].rstrip('\n') + '\n\n/* ---- exportación de resultados ---- */' + bloque + '\n' + texto[corte:]
        ruta.write_text(nuevo, encoding='utf-8')
        cambiados.append(nombre)
    print(f'{len(cambiados)} fragmentos actualizados')


if __name__ == '__main__':
    main()
