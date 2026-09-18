/* CODE — datos de ejemplo para las demos comerciales.
   Catálogo, cartera de clientes y series de venta ficticios, construidos con la
   estructura real de una distribuidora de embutidos y lácteos que atiende food service.
   Ningún dato corresponde a una empresa o persona real. */
(function (global) {
  'use strict';

  const PRODUCTOS = [
    // sku, nombre, marca, linea, presentación, unidad, costo, lista, mayorista, stock, rotación mensual
    ['EMB-101', 'Hot dog de pollo', 'Cerdeña', 'Embutidos', 'Bolsa 1 kg', 'kg', 9.20, 12.90, 11.40, 380, 260],
    ['EMB-102', 'Hot dog especial de res', 'Cerdeña', 'Embutidos', 'Bolsa 1 kg', 'kg', 11.80, 16.50, 14.60, 210, 150],
    ['EMB-103', 'Jamonada de pollo', 'Cerdeña', 'Embutidos', 'Barra 2.5 kg', 'kg', 10.40, 14.20, 12.70, 165, 120],
    ['EMB-104', 'Chorizo parrillero', 'Cerdeña', 'Embutidos', 'Bolsa 1 kg', 'kg', 15.60, 21.90, 19.40, 95, 70],
    ['EMB-105', 'Salchicha huachana', 'Cerdeña', 'Embutidos', 'Bolsa 1 kg', 'kg', 13.90, 19.50, 17.20, 88, 62],
    ['EMB-106', 'Tocino ahumado en tiras', 'Cerdeña', 'Embutidos', 'Bolsa 1 kg', 'kg', 21.40, 29.90, 26.50, 54, 40],
    ['EMB-107', 'Jamón inglés', 'Cerdeña', 'Embutidos', 'Pieza 3 kg', 'kg', 17.20, 23.80, 21.10, 42, 28],
    ['EMB-108', 'Mortadela con aceituna', 'Cerdeña', 'Embutidos', 'Barra 2.5 kg', 'kg', 12.10, 16.80, 14.90, 76, 48],
    ['EMB-109', 'Vianesa ahumada', 'Cerdeña', 'Embutidos', 'Bolsa 1 kg', 'kg', 14.30, 19.90, 17.60, 63, 45],
    ['EMB-201', 'Hot dog clásico', 'Americana', 'Embutidos', 'Bolsa 1 kg', 'kg', 8.10, 11.40, 10.10, 420, 300],
    ['EMB-202', 'Jamonada económica', 'Americana', 'Embutidos', 'Barra 2.5 kg', 'kg', 9.30, 12.80, 11.30, 190, 140],
    ['EMB-203', 'Chorizo ahumado', 'Americana', 'Embutidos', 'Bolsa 1 kg', 'kg', 13.10, 18.20, 16.10, 72, 52],
    ['EMB-301', 'Nuggets de pollo apanados', 'Delys', 'Congelados', 'Bolsa 1 kg', 'kg', 13.70, 19.20, 17.00, 130, 96],
    ['EMB-302', 'Hamburguesa de res 8 u.', 'Delys', 'Congelados', 'Caja 1 kg', 'kg', 15.40, 21.50, 19.00, 118, 84],
    ['EMB-303', 'Salchicha cóctel', 'Delys', 'Embutidos', 'Bolsa 500 g', 'und', 6.40, 9.20, 8.10, 145, 90],
    ['LAC-401', 'Queso Edam madurado', 'Piamonte', 'Lácteos', 'Pieza 3.5 kg', 'kg', 28.60, 39.90, 35.40, 58, 36],
    ['LAC-402', 'Queso fresco de vaca', 'Piamonte', 'Lácteos', 'Molde 500 g', 'und', 8.90, 12.50, 11.10, 240, 180],
    ['LAC-403', 'Queso mozzarella pizzero', 'Piamonte', 'Lácteos', 'Bloque 5 kg', 'kg', 24.30, 33.90, 30.10, 96, 74],
    ['LAC-501', 'Queso Dambo', 'Oquendo', 'Lácteos', 'Pieza 4 kg', 'kg', 26.80, 37.40, 33.10, 47, 30],
    ['LAC-502', 'Queso paria', 'Oquendo', 'Lácteos', 'Pieza 1 kg', 'kg', 23.50, 32.80, 29.10, 39, 22],
    ['LAC-601', 'Queso cheddar en láminas', 'Président', 'Lácteos', 'Caja 1 kg', 'kg', 31.20, 43.50, 38.60, 66, 50],
    ['LAC-602', 'Crema de leche', 'Parmalat', 'Lácteos', 'Tetra 1 L', 'und', 9.70, 13.60, 12.00, 210, 160],
    ['LAC-603', 'Mantequilla sin sal', 'Président', 'Lácteos', 'Pastilla 200 g', 'und', 7.30, 10.40, 9.20, 175, 120],
    ['LAC-604', 'Queso crema para untar', 'Kraft', 'Lácteos', 'Pote 1 kg', 'und', 18.40, 25.80, 22.90, 84, 58]
  ].map(p => ({
    sku: p[0], nombre: p[1], marca: p[2], linea: p[3], presentacion: p[4], unidad: p[5],
    costo: p[6], lista: p[7], mayorista: p[8], stock: p[9], rotacion: p[10]
  }));

  const CLIENTES = [
    // nombre, tipo, distrito, lat, lon, vendedor, estado, ticket promedio, frecuencia (días), última compra (días atrás)
    ['Broaster El Dorado', 'Pollería', 'San Martín de Porres', -12.0100, -77.0790, 'Manuel', 'Activo', 1840, 7, 3],
    ['Sanguchería La Esquina', 'Sanguchería', 'Breña', -12.0580, -77.0490, 'Manuel', 'Activo', 620, 7, 2],
    ['Pizzería Forno Vivo', 'Pizzería', 'Miraflores', -12.1200, -77.0290, 'Ana', 'Activo', 2450, 10, 5],
    ['Chifa Wong Hermanos', 'Chifa', 'Cercado de Lima', -12.0480, -77.0380, 'Ana', 'Activo', 1180, 14, 12],
    ['Cafetería Grano Alto', 'Cafetería', 'San Isidro', -12.0980, -77.0350, 'Ana', 'Prospecto', 0, 0, 0],
    ['Menú Doña Rosa', 'Menú', 'Comas', -11.9460, -77.0620, 'Luis', 'Activo', 480, 7, 9],
    ['Hamburguesas Rústica Norte', 'Fast food', 'Los Olivos', -11.9700, -77.0700, 'Luis', 'Activo', 3200, 7, 1],
    ['Minimarket Doña Chela', 'Minimarket', 'Independencia', -11.9880, -77.0540, 'Luis', 'En riesgo', 720, 14, 38],
    ['Salchipapería El Chino', 'Fast food', 'San Juan de Lurigancho', -11.9930, -76.9970, 'Manuel', 'Activo', 890, 7, 4],
    ['Restaurante Mar Bravo', 'Restaurante', 'Chorrillos', -12.1720, -77.0210, 'Ana', 'Activo', 1560, 10, 7],
    ['Panadería Trigo de Oro', 'Panadería', 'Surquillo', -12.1120, -77.0150, 'Ana', 'Prospecto', 0, 0, 0],
    ['Quesería Emilia', 'Especializado', 'Jesús María', -12.0730, -77.0480, 'Manuel', 'Prospecto', 0, 0, 0],
    ['Buffet Corporativo Andes', 'Catering', 'Ate', -12.0270, -76.9180, 'Luis', 'Activo', 4100, 15, 11],
    ['Cevichería Punto Azul Sur', 'Restaurante', 'Villa El Salvador', -12.2130, -76.9370, 'Luis', 'En riesgo', 980, 14, 45]
  ].map(c => ({
    nombre: c[0], tipo: c[1], distrito: c[2], lat: c[3], lon: c[4], vendedor: c[5],
    estado: c[6], ticket: c[7], frecuencia: c[8], ultima: c[9]
  }));

  /* Generador determinista: las series se ven aleatorias pero no cambian entre recargas. */
  function aleatorio(semilla) {
    let s = semilla >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  const VENDEDORES = ['Manuel', 'Ana', 'Luis'];

  /** Ventas mensuales por vendedor y línea, con estacionalidad de fin de año. */
  function ventasMensuales() {
    const r = aleatorio(20260917);
    const filas = [];
    MESES.forEach((mes, m) => {
      const estacion = 1 + 0.22 * Math.sin((m - 3) / 12 * 2 * Math.PI) + (m >= 10 ? 0.18 : 0);
      VENDEDORES.forEach((v, vi) => {
        ['Embutidos', 'Lácteos', 'Congelados'].forEach((linea, li) => {
          const base = [46000, 31000, 12000][li] * [1, 0.82, 0.68][vi] / 3;
          const monto = base * estacion * (0.86 + r() * 0.3);
          const margen = [0.215, 0.243, 0.198][li];
          filas.push({ mes, m, vendedor: v, linea, monto: Math.round(monto), margen: Math.round(monto * margen) });
        });
      });
    });
    return filas;
  }

  global.DATOS = { PRODUCTOS, CLIENTES, MESES, VENDEDORES, ventasMensuales, aleatorio };
})(window);
