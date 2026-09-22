/**
 * Dataset de demostración — empresa ficticia de servicios B2B en México.
 * Construido para ejercitar los siete detectores con datos internamente
 * coherentes (la ecuación contable cuadra, el embudo decrece, el organigrama
 * es acíclico). Los números son ilustrativos y no corresponden a ninguna
 * empresa real.
 */
export const EMPRESA_DEMO = {
  empresa: {
    nombre: 'Distribuidora Norte S.A. de C.V.',
    sector: 'Servicios B2B / Distribución especializada',
    moneda: 'MXN',
    periodo: '2025-01/2025-12',
    jurisdiccion: 'MX',
    tasaDescuento: 0.16,
    salarioMinimoDiario: 278.80,
    // Periodicidad declarada por bloque. Omitirla hace que el motor asuma un
    // valor por defecto y lo advierta, porque un error de factor temporal
    // equivoca los impactos por un múltiplo de 12.
    periodicidad: { procesos: 'mensual', embudo: 'anual', comercial: 'anual' },
  },

  finanzas: {
    ingresos: 48_500_000,
    costoVentas: 27_160_000,
    gastosOperacion: 17_800_000,
    gastosFinancieros: 1_450_000,
    activoCirculante: 19_400_000,
    pasivoCirculante: 15_800_000,
    activoTotal: 34_200_000,
    pasivoTotal: 23_900_000,
    capitalContable: 10_300_000,
    utilidadesRetenidas: 3_100_000,
    inventario: 6_900_000,
    cuentasPorCobrar: 10_100_000,
    cuentasPorPagar: 5_200_000,
    efectivo: 2_400_000,
    quemaMensualNeta: -180_000,
  },

  gastos: [
    {
      id: 'g1', concepto: 'Licencias de software corporativo', categoria: 'Tecnología',
      proveedor: 'SoftCorp SA', monto: 2_340_000,
      serie: [178000, 182000, 195000, 191000, 198000, 196000, 199000, 201000, 197000, 203000, 199000, 201000],
      driver: [412, 398, 455, 421, 468, 402, 439, 448, 411, 462, 425, 419],
      driverNombre: 'usuarios activos',
      contratoVence: '2026-03-31',
    },
    {
      id: 'g2', concepto: 'Logística y fletes', categoria: 'Operación',
      proveedor: 'TransLog', monto: 4_180_000,
      serie: [298000, 312000, 356000, 331000, 378000, 318000, 349000, 361000, 322000, 371000, 339000, 345000],
      driver: [1420, 1502, 1710, 1591, 1820, 1530, 1680, 1740, 1550, 1785, 1630, 1660],
      driverNombre: 'envíos realizados',
    },
    {
      id: 'g3', concepto: 'Consultoría estratégica externa', categoria: 'Servicios profesionales',
      proveedor: 'Grupo Asesor Integral', monto: 1_920_000,
      serie: [160000, 160000, 160000, 160000, 160000, 160000, 160000, 160000, 160000, 160000, 160000, 160000],
      driver: [1420, 1502, 1710, 1591, 1820, 1530, 1680, 1740, 1550, 1785, 1630, 1660],
      driverNombre: 'envíos realizados',
      justificacionOperativa: null,
      contratoVence: '2026-12-31',
      facturas: [
        160000, 148000, 152000, 159000, 147000, 155000, 151000, 158000, 149000, 153000,
        157000, 146000, 154000, 150000, 156000, 148000, 159000, 147000, 152000, 158000,
        149000, 155000, 151000, 153000, 157000, 146000, 154000, 150000, 156000, 159000,
        148000, 152000, 147000, 155000, 151000, 158000, 149000, 153000, 157000, 146000,
        154000, 150000, 156000, 148000, 159000, 147000, 152000, 158000, 149000, 155000,
        151000, 153000, 157000, 146000, 154000,
      ],
    },
    { id: 'g5', concepto: 'Arrendamiento de oficinas', categoria: 'Instalaciones', proveedor: 'Inmobiliaria Centro', monto: 1_680_000, contratoVence: '2027-06-30' },
    { id: 'g6', concepto: 'Servicios de limpieza', categoria: 'Instalaciones', proveedor: 'CleanPro', monto: 186_000 },
    { id: 'g7', concepto: 'Mantenimiento de instalaciones', categoria: 'Instalaciones', proveedor: 'ManPro', monto: 214_000 },
    { id: 'g8', concepto: 'Seguridad privada', categoria: 'Instalaciones', proveedor: 'SegMax', monto: 242_000 },
    { id: 'g9', concepto: 'Servicios de jardinería', categoria: 'Instalaciones', proveedor: 'VerdeMax', monto: 198_000 },
    { id: 'g10', concepto: 'Adecuación de oficina ejecutiva', categoria: 'Instalaciones', proveedor: 'DecoPlus', monto: 1_460_000 },
    { id: 'g11', concepto: 'Publicidad digital', categoria: 'Comercial', monto: 2_100_000 },
    { id: 'g12', concepto: 'Viáticos y representación', categoria: 'Comercial', monto: 860_000 },
    { id: 'g13', concepto: 'Telefonía e internet', categoria: 'Tecnología', proveedor: 'TelCo', monto: 312_000 },
    { id: 'g14', concepto: 'Papelería y consumibles', categoria: 'Administración', monto: 168_000 },
  ],

  procesos: [
    {
      id: 'p1', nombre: 'Recepción de pedido', tasaLlegada: 1660, capacidad: 2400,
      tiempoCiclo: [2.1, 2.3, 2.0, 2.2, 2.4, 2.1, 2.2, 2.0, 2.3, 2.1, 2.2, 2.3],
      defectos: 12, unidades: 1660, oportunidades: 2, costoRetrabajo: 380,
    },
    {
      // capacidad es POR SERVIDOR: 593 × 3 = 1,779 pedidos/mes de capacidad nominal.
      id: 'p2', nombre: 'Validación de crédito', tasaLlegada: 1660, capacidad: 593,
      servidores: 3, nivelServicioObjetivo: 0.85, tiempoObjetivo: 1,
      tiempoCiclo: [8.2, 9.1, 12.4, 8.8, 15.2, 9.4, 8.6, 18.1, 9.2, 8.9, 14.8, 9.6, 8.4, 16.2, 9.1],
      defectos: 94, unidades: 1660, oportunidades: 1, costoRetrabajo: 1250,
      lslTiempo: 4, uslTiempo: 12,
    },
    {
      id: 'p3', nombre: 'Preparación y empaque', tasaLlegada: 1660, capacidad: 3200,
      tiempoCiclo: [4.1, 4.3, 4.2, 4.4, 4.2, 4.5, 4.3, 4.6, 4.4, 4.7, 4.5, 4.8, 4.6, 4.9, 4.7],
      defectos: 38, unidades: 1660, oportunidades: 3, costoRetrabajo: 620,
    },
    {
      id: 'p4', nombre: 'Distribución', tasaLlegada: 1660, capacidad: 5800,
      tiempoCiclo: [22, 31, 19, 44, 26, 21, 38, 24, 52, 23, 29, 41, 25, 33, 27],
      defectos: 21, unidades: 1660, oportunidades: 1, costoRetrabajo: 890,
    },
  ],

  embudo: [
    { etapa: 'Prospectos contactados', volumen: 4200, diasEnEtapa: 3 },
    { etapa: 'Reunión agendada', volumen: 1180, diasEnEtapa: 8 },
    { etapa: 'Propuesta enviada', volumen: 742, diasEnEtapa: 12 },
    { etapa: 'Negociación', volumen: 318, diasEnEtapa: 21 },
    { etapa: 'Cierre', volumen: 214, diasEnEtapa: 6, valorUnitario: 68_000 },
  ],

  personal: [
    { id: 'dg',  puesto: 'Dirección General', area: 'Dirección', nivel: 1, costoAnual: 2_400_000, fte: 1, horasSemana: 48, demandaHorasSemana: 52, antiguedadAños: 11, salarioDiario: 5480, critico: true,
      responsabilidades: ['Estrategia', 'Relación con accionistas', 'Aprobación de inversiones'] },

    { id: 'dop', puesto: 'Dirección de Operaciones', area: 'Operaciones', nivel: 2, reportaA: 'dg', costoAnual: 1_450_000, fte: 1, horasSemana: 48, demandaHorasSemana: 58, antiguedadAños: 7, salarioDiario: 3310,
      responsabilidades: ['Planeación de operaciones', 'Gestión de proveedores logísticos', 'Control de inventario', 'Indicadores operativos'] },
    { id: 'gop', puesto: 'Gerencia de Operaciones', area: 'Operaciones', nivel: 3, reportaA: 'dop', costoAnual: 890_000, fte: 1, horasSemana: 48, demandaHorasSemana: 41, antiguedadAños: 4, salarioDiario: 2030,
      responsabilidades: ['Planeación de operaciones', 'Gestión de proveedores logísticos', 'Control de inventario', 'Supervisión de almacén'] },
    { id: 'sup1', puesto: 'Supervisión de Almacén', area: 'Operaciones', nivel: 4, reportaA: 'gop', costoAnual: 420_000, fte: 1, horasSemana: 48, demandaHorasSemana: 49, antiguedadAños: 5, salarioDiario: 960, produccion: 1850 },
    { id: 'alm1', puesto: 'Almacenista A', area: 'Operaciones', nivel: 5, reportaA: 'sup1', costoAnual: 228_000, fte: 1, horasSemana: 48, demandaHorasSemana: 47, antiguedadAños: 3, salarioDiario: 520, produccion: 1420 },
    { id: 'alm2', puesto: 'Almacenista B', area: 'Operaciones', nivel: 5, reportaA: 'sup1', costoAnual: 228_000, fte: 1, horasSemana: 48, demandaHorasSemana: 46, antiguedadAños: 2, salarioDiario: 520, produccion: 910 },
    { id: 'alm3', puesto: 'Almacenista C', area: 'Operaciones', nivel: 5, reportaA: 'sup1', costoAnual: 228_000, fte: 1, horasSemana: 48, demandaHorasSemana: 48, antiguedadAños: 4, salarioDiario: 520, produccion: 1380 },
    { id: 'alm4', puesto: 'Almacenista D', area: 'Operaciones', nivel: 5, reportaA: 'sup1', costoAnual: 228_000, fte: 1, horasSemana: 48, demandaHorasSemana: 44, antiguedadAños: 1, salarioDiario: 520, produccion: 760 },

    { id: 'dcom', puesto: 'Dirección Comercial', area: 'Comercial', nivel: 2, reportaA: 'dg', costoAnual: 1_380_000, fte: 1, horasSemana: 48, demandaHorasSemana: 56, antiguedadAños: 6, salarioDiario: 3150, critico: true,
      responsabilidades: ['Estrategia comercial', 'Cuentas clave', 'Pricing', 'Pronóstico de ventas'] },
    { id: 'gcom', puesto: 'Gerencia Comercial', area: 'Comercial', nivel: 3, reportaA: 'dcom', costoAnual: 760_000, fte: 1, horasSemana: 48, demandaHorasSemana: 27, antiguedadAños: 3, salarioDiario: 1735,
      responsabilidades: ['Estrategia comercial', 'Cuentas clave', 'Pricing', 'Seguimiento de equipo'] },
    { id: 'ej1', puesto: 'Ejecutivo Comercial 1', area: 'Comercial', nivel: 4, reportaA: 'gcom', costoAnual: 390_000, fte: 1, horasSemana: 48, demandaHorasSemana: 45, antiguedadAños: 4, salarioDiario: 890, produccion: 62 },
    { id: 'ej2', puesto: 'Ejecutivo Comercial 2', area: 'Comercial', nivel: 4, reportaA: 'gcom', costoAnual: 390_000, fte: 1, horasSemana: 48, demandaHorasSemana: 43, antiguedadAños: 2, salarioDiario: 890, produccion: 58 },
    { id: 'ej3', puesto: 'Ejecutivo Comercial 3', area: 'Comercial', nivel: 4, reportaA: 'gcom', costoAnual: 390_000, fte: 1, horasSemana: 48, demandaHorasSemana: 26, antiguedadAños: 1, salarioDiario: 890, produccion: 24 },
    { id: 'ej4', puesto: 'Ejecutivo Comercial 4', area: 'Comercial', nivel: 4, reportaA: 'gcom', costoAnual: 390_000, fte: 1, horasSemana: 48, demandaHorasSemana: 44, antiguedadAños: 3, salarioDiario: 890, produccion: 55 },

    { id: 'daf', puesto: 'Dirección de Administración y Finanzas', area: 'Administración', nivel: 2, reportaA: 'dg', costoAnual: 1_320_000, fte: 1, horasSemana: 48, demandaHorasSemana: 51, antiguedadAños: 9, salarioDiario: 3010, critico: true,
      responsabilidades: ['Contabilidad', 'Tesorería', 'Cumplimiento fiscal', 'Relación bancaria', 'Nómina'] },
    { id: 'cont', puesto: 'Contabilidad', area: 'Administración', nivel: 3, reportaA: 'daf', costoAnual: 520_000, fte: 1, horasSemana: 48, demandaHorasSemana: 50, antiguedadAños: 6, salarioDiario: 1190 },
    { id: 'cxc', puesto: 'Cobranza', area: 'Administración', nivel: 3, reportaA: 'daf', costoAnual: 340_000, fte: 1, horasSemana: 48, demandaHorasSemana: 54, antiguedadAños: 4, salarioDiario: 775 },
    { id: 'rh',  puesto: 'Recursos Humanos', area: 'Administración', nivel: 3, reportaA: 'daf', costoAnual: 480_000, fte: 1, horasSemana: 48, demandaHorasSemana: 29, antiguedadAños: 5, salarioDiario: 1095 },
  ],

  comercial: {
    cac: 41_500,
    margenBrutoPct: 0.44,
    ingresoPromedioCliente: 18_900,
    churnMensual: 0.038,
    gastoComercialPeriodo: 2_960_000,
    nuevosClientesPeriodo: 18,
    crecimientoAnual: 0.07,
    margenEbitdaPct: 0.072,
    clientes: [
      { nombre: 'Corporativo Aurora', ingreso: 14_100_000 },
      { nombre: 'Industrias Del Valle', ingreso: 7_300_000 },
      { nombre: 'Comercial Poniente', ingreso: 5_800_000 },
      { nombre: 'Grupo Mercantil Sur', ingreso: 4_200_000 },
      { nombre: 'Distribuciones Bajío', ingreso: 3_400_000 },
      { nombre: 'Abastos Central', ingreso: 2_900_000 },
      { nombre: 'Servicios Integrales MX', ingreso: 2_400_000 },
      { nombre: 'Otros (cartera larga)', ingreso: 8_400_000 },
    ],
    canales: [
      { nombre: 'Venta directa', inversion: 1_240_000, ingresoAtribuido: 21_800_000, conversiones: 96 },
      { nombre: 'Publicidad digital', inversion: 860_000, ingresoAtribuido: 1_640_000, conversiones: 31 },
      { nombre: 'Ferias y eventos', inversion: 620_000, ingresoAtribuido: 980_000, conversiones: 14 },
      { nombre: 'Referidos', inversion: 240_000, ingresoAtribuido: 4_900_000, conversiones: 73 },
    ],
    preciosObservados: [
      { precio: 62_000, volumen: 241 }, { precio: 64_000, volumen: 236 },
      { precio: 66_000, volumen: 229 }, { precio: 68_000, volumen: 214 },
      { precio: 70_000, volumen: 208 }, { precio: 65_000, volumen: 232 },
    ],
  },
};

export default EMPRESA_DEMO;
