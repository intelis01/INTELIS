/**
 * INTELIS · Modelo de Datos y Validación de Integridad
 * ─────────────────────────────────────────────────────────────────────────────
 * El motor solo es tan confiable como los datos que recibe. Este módulo:
 *   1. Define el contrato de entrada (qué campos, qué unidades, qué periodicidad).
 *   2. Valida tipos, rangos y coherencia contable.
 *   3. Calcula un ÍNDICE DE SUFICIENCIA DE DATOS (ISD) por dominio, que
 *      modula la confianza de cada hallazgo posterior.
 *
 * Principio rector: un detector NUNCA se ejecuta sobre datos insuficientes.
 * Prefiere declarar "no evaluable por falta de X" antes que emitir un número
 * sin respaldo. La abstención informada es un resultado válido.
 */

import { isNum, clean, sum, round } from './stats.js';

/* ═══════════════════════════════════════════════════════════════════════════
   1. CONTRATO DE ENTRADA
   ═══════════════════════════════════════════════════════════════════════════ */

export const ESQUEMA = {
  empresa: {
    requeridos: ['nombre', 'sector', 'moneda', 'periodo'],
    campos: {
      nombre:      { tipo: 'string', desc: 'Razón social o nombre comercial' },
      sector:      { tipo: 'string', desc: 'Sector económico (para selección de benchmark)' },
      moneda:      { tipo: 'string', desc: 'Código ISO 4217, p. ej. MXN' },
      periodo:     { tipo: 'string', desc: 'Periodo analizado, p. ej. "2025-01/2025-12"' },
      jurisdiccion:{ tipo: 'string', desc: 'Clave de jurisdicción legal. Por defecto MX', opcional: true },
      empleados:   { tipo: 'number', desc: 'Plantilla total (headcount)', opcional: true },
      tasaDescuento:{tipo: 'number', desc: 'Costo de capital anual para VPN/TIR (decimal)', opcional: true },
    },
  },
  finanzas: {
    requeridos: ['ingresos', 'costoVentas', 'gastosOperacion'],
    campos: {
      ingresos:           { tipo: 'number', desc: 'Ingresos del periodo' },
      costoVentas:        { tipo: 'number', desc: 'Costo de ventas' },
      gastosOperacion:    { tipo: 'number', desc: 'Gastos de operación totales' },
      gastosFinancieros:  { tipo: 'number', opcional: true },
      ebit:               { tipo: 'number', opcional: true, desc: 'Se deriva si no se provee' },
      activoCirculante:   { tipo: 'number', opcional: true },
      pasivoCirculante:   { tipo: 'number', opcional: true },
      activoTotal:        { tipo: 'number', opcional: true },
      pasivoTotal:        { tipo: 'number', opcional: true },
      capitalContable:    { tipo: 'number', opcional: true },
      utilidadesRetenidas:{ tipo: 'number', opcional: true },
      inventario:         { tipo: 'number', opcional: true },
      cuentasPorCobrar:   { tipo: 'number', opcional: true },
      cuentasPorPagar:    { tipo: 'number', opcional: true },
      efectivo:           { tipo: 'number', opcional: true },
      quemaMensualNeta:   { tipo: 'number', opcional: true, desc: 'Flujo neto mensual (negativo si consume caja)' },
    },
  },
  gastos: {
    desc: 'Partidas de gasto individuales. Cuanto mayor el detalle, mayor la potencia del análisis.',
    itemCampos: {
      id: 'string', concepto: 'string', categoria: 'string',
      proveedor: 'string (opcional)', monto: 'number',
      serie: 'number[] (opcional) — importes por periodo, para prueba de tendencia',
      driver: 'number[] (opcional) — driver de actividad por periodo, para regresión',
      driverNombre: 'string (opcional)',
      contratoVence: 'ISO date (opcional)',
      justificacionOperativa: 'string (opcional)',
      facturas: 'number[] (opcional) — importes individuales, para prueba de Benford',
    },
  },
  procesos: {
    desc: 'Etapas operativas con métricas de flujo, para SPC y teoría de restricciones.',
    itemCampos: {
      id: 'string', nombre: 'string',
      tasaLlegada: 'number — unidades por periodo que entran (λ)',
      capacidad: 'number — unidades por periodo que la etapa puede procesar (μ)',
      servidores: 'number (opcional) — c, para M/M/c',
      tiempoCiclo: 'number[] (opcional) — serie de tiempos, para carta de control',
      defectos: 'number (opcional)', unidades: 'number (opcional)',
      oportunidades: 'number (opcional)',
      costoRetrabajo: 'number (opcional) — costo unitario de corregir un defecto',
      lslTiempo: 'number (opcional)', uslTiempo: 'number (opcional)',
    },
  },
  embudo: {
    desc: 'Etapas del embudo comercial en orden, con volumen que entra a cada una.',
    itemCampos: {
      etapa: 'string', volumen: 'number',
      diasEnEtapa: 'number (opcional)',
      valorUnitario: 'number (opcional) — ticket promedio si convierte',
    },
  },
  personal: {
    desc: 'Puestos con costo, carga y responsabilidades.',
    itemCampos: {
      id: 'string', puesto: 'string', area: 'string',
      nivel: 'number — 1 = dirección general',
      reportaA: 'string (opcional) — id del superior',
      costoAnual: 'number — costo total empresa (sueldo + carga social + prestaciones)',
      fte: 'number — equivalente de tiempo completo contratado',
      horasSemana: 'number (opcional)',
      demandaHorasSemana: 'number (opcional) — carga real medida o estimada',
      responsabilidades: 'string[] (opcional) — para índice de duplicidad',
      produccion: 'number (opcional) — salida medible del puesto',
      antiguedadAños: 'number (opcional)',
      salarioDiario: 'number (opcional) — para cálculo de finiquito',
      critico: 'boolean (opcional) — punto único de falla',
    },
  },
  comercial: {
    campos: {
      cac: 'number — costo de adquisición de cliente',
      margenBrutoPct: 'number — decimal',
      ingresoPromedioCliente: 'number — por periodo',
      churnMensual: 'number — decimal',
      gastoComercialPeriodo: 'number (opcional)',
      nuevosClientesPeriodo: 'number (opcional)',
      crecimientoAnual: 'number (opcional) — decimal',
      margenEbitdaPct: 'number (opcional) — decimal',
      clientes: 'Array<{nombre, ingreso}> (opcional) — para concentración',
      canales: 'Array<{nombre, inversion, ingresoAtribuido, conversiones}> (opcional)',
      preciosObservados: 'Array<{precio, volumen}> (opcional) — para elasticidad',
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. VALIDACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

const err = (campo, mensaje, severidad = 'error') => ({ campo, mensaje, severidad });

/**
 * Valida el dataset y devuelve errores bloqueantes, advertencias y el ISD.
 * Los errores bloqueantes impiden la ejecución del dominio afectado, no del
 * motor completo: el sistema degrada con elegancia y lo declara.
 */
export function validar(d) {
  const errores = [], avisos = [];

  if (!d || typeof d !== 'object') {
    return { valido: false, errores: [err('raiz', 'Dataset ausente o no es un objeto')], avisos: [], isd: {} };
  }

  // --- empresa
  if (!d.empresa) errores.push(err('empresa', 'Falta el bloque empresa'));
  else {
    ESQUEMA.empresa.requeridos.forEach((k) => {
      if (!d.empresa[k]) errores.push(err(`empresa.${k}`, `Campo requerido ausente: ${k}`));
    });
    if (d.empresa.tasaDescuento !== undefined && !(d.empresa.tasaDescuento >= 0 && d.empresa.tasaDescuento < 1))
      avisos.push(err('empresa.tasaDescuento', 'Se espera un decimal anual, p. ej. 0.15 para 15%', 'aviso'));
  }

  // --- finanzas y coherencia contable
  const f = d.finanzas;
  if (!f) errores.push(err('finanzas', 'Falta el bloque finanzas'));
  else {
    ESQUEMA.finanzas.requeridos.forEach((k) => {
      if (!isNum(f[k])) errores.push(err(`finanzas.${k}`, `Campo numérico requerido ausente o inválido: ${k}`));
    });
    if (isNum(f.ingresos) && f.ingresos <= 0)
      errores.push(err('finanzas.ingresos', 'Los ingresos deben ser positivos para normalizar razones'));
    if (isNum(f.costoVentas) && isNum(f.ingresos) && f.costoVentas > f.ingresos)
      avisos.push(err('finanzas.costoVentas', 'El costo de ventas supera a los ingresos: margen bruto negativo. Verificar clasificación de partidas.', 'aviso'));
    // Ecuación contable básica
    if (isNum(f.activoTotal) && isNum(f.pasivoTotal) && isNum(f.capitalContable)) {
      const desv = Math.abs(f.activoTotal - (f.pasivoTotal + f.capitalContable)) / Math.max(1, f.activoTotal);
      if (desv > 0.01)
        errores.push(err('finanzas.balance',
          `Descuadre en la ecuación contable A = P + C de ${round(desv * 100, 2)}%. El análisis de solvencia se suspende hasta corregir.`));
    }
    if (isNum(f.activoCirculante) && isNum(f.activoTotal) && f.activoCirculante > f.activoTotal)
      errores.push(err('finanzas.activoCirculante', 'El activo circulante excede al activo total'));
  }

  // --- gastos: la suma detallada no debe exceder el agregado
  if (Array.isArray(d.gastos) && d.gastos.length && f && isNum(f.gastosOperacion)) {
    const det = sum(d.gastos.map((g) => Number(g.monto) || 0));
    const cob = det / f.gastosOperacion;
    if (cob > 1.05)
      errores.push(err('gastos', `El detalle de gastos (${round(det)}) excede el agregado declarado (${round(f.gastosOperacion)}) en ${round((cob - 1) * 100, 1)}%. Hay doble conteo o mala clasificación.`));
    else if (cob < 0.6)
      avisos.push(err('gastos', `El detalle solo cubre ${round(cob * 100, 1)}% del gasto de operación. El análisis de Pareto omitirá el ${round((1 - cob) * 100, 1)}% restante.`, 'aviso'));
  }

  // --- procesos
  if (Array.isArray(d.procesos)) {
    d.procesos.forEach((p, i) => {
      if (!isNum(p.tasaLlegada) || !isNum(p.capacidad))
        avisos.push(err(`procesos[${i}]`, `Etapa "${p.nombre || p.id || i}" sin λ o μ: no se evaluará como restricción.`, 'aviso'));
      if (isNum(p.capacidad) && p.capacidad <= 0)
        errores.push(err(`procesos[${i}].capacidad`, 'La capacidad debe ser positiva'));
    });
  }

  // --- embudo: monotonía decreciente
  if (Array.isArray(d.embudo) && d.embudo.length > 1) {
    for (let i = 1; i < d.embudo.length; i++) {
      if (Number(d.embudo[i].volumen) > Number(d.embudo[i - 1].volumen))
        errores.push(err(`embudo[${i}]`, `La etapa "${d.embudo[i].etapa}" tiene más volumen que la anterior. Un embudo no puede crecer: revisar definición de etapas o doble conteo.`));
    }
  }

  // --- personal
  if (Array.isArray(d.personal)) {
    const ids = new Set();
    d.personal.forEach((p, i) => {
      if (!p.id) avisos.push(err(`personal[${i}]`, 'Puesto sin id: no podrá vincularse en el grafo organizacional', 'aviso'));
      else if (ids.has(p.id)) errores.push(err(`personal[${i}].id`, `id duplicado: ${p.id}`));
      else ids.add(p.id);
      if (!isNum(p.costoAnual)) avisos.push(err(`personal[${i}]`, `Puesto "${p.puesto || p.id}" sin costo anual: se excluye del análisis económico`, 'aviso'));
    });
    d.personal.forEach((p, i) => {
      if (p.reportaA && !ids.has(p.reportaA))
        errores.push(err(`personal[${i}].reportaA`, `"${p.reportaA}" no existe en la plantilla: el grafo organizacional está roto`));
    });
    // Ciclos en la jerarquía
    const mapa = new Map(d.personal.map((p) => [p.id, p.reportaA]));
    d.personal.forEach((p) => {
      let cur = p.reportaA, saltos = 0;
      while (cur && saltos++ < d.personal.length + 1) {
        if (cur === p.id) { errores.push(err('personal', `Ciclo de reporte detectado en "${p.id}"`)); break; }
        cur = mapa.get(cur);
      }
    });
  }

  // --- comercial
  const c = d.comercial;
  if (c) {
    if (isNum(c.churnMensual) && (c.churnMensual < 0 || c.churnMensual >= 1))
      errores.push(err('comercial.churnMensual', 'El churn mensual debe ser un decimal en [0,1)'));
    if (isNum(c.margenBrutoPct) && (c.margenBrutoPct < -1 || c.margenBrutoPct > 1))
      errores.push(err('comercial.margenBrutoPct', 'El margen bruto debe expresarse como decimal, p. ej. 0.65'));
  }

  // --- periodicidad declarada
  ['procesos', 'embudo'].forEach((b) => {
    if (Array.isArray(d[b]) && d[b].length && !d.empresa?.periodicidad?.[b]) {
      const pd = periodicidadDe(d, b, b === 'embudo' ? 'anual' : 'mensual');
      avisos.push(err(`empresa.periodicidad.${b}`, pd.aviso, 'aviso'));
    }
  });

  const isd = indiceSuficiencia(d);
  return {
    valido: errores.length === 0,
    errores, avisos, isd,
    dominiosEvaluables: Object.entries(isd).filter(([, v]) => v.evaluable).map(([k]) => k),
    dominiosOmitidos: Object.entries(isd).filter(([, v]) => !v.evaluable)
      .map(([k, v]) => ({ dominio: k, razon: v.razon })),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. ÍNDICE DE SUFICIENCIA DE DATOS (ISD)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Cobertura ponderada de los insumos que cada detector necesita.
 * ISD ∈ [0,1]. Un dominio con ISD < umbralMinimo se declara NO EVALUABLE y el
 * informe lo reporta como vacío de información, no como ausencia de problemas.
 * Esta distinción es esencial: "no encontramos nada" y "no pudimos ver" son
 * conclusiones radicalmente distintas.
 */
export function indiceSuficiencia(d) {
  const has = (v) => (Array.isArray(v) ? v.length > 0 : isNum(v) || (!!v && v !== ''));
  const cobertura = (reqs) => {
    const pesos = sum(reqs.map((r) => r.peso));
    const logrado = sum(reqs.filter((r) => r.ok).map((r) => r.peso));
    return pesos ? logrado / pesos : 0;
  };
  const f = d.finanzas || {}, c = d.comercial || {};

  const dominios = {
    procesos: {
      umbral: 0.40,
      reqs: [
        { n: 'etapas con λ y μ', peso: 3, ok: (d.procesos || []).some((p) => isNum(p.tasaLlegada) && isNum(p.capacidad)) },
        { n: 'series de tiempo de ciclo (n≥10)', peso: 2, ok: (d.procesos || []).some((p) => clean(p.tiempoCiclo).length >= 10) },
        { n: 'conteo de defectos y unidades', peso: 2, ok: (d.procesos || []).some((p) => isNum(p.defectos) && isNum(p.unidades)) },
        { n: 'costo de retrabajo', peso: 1, ok: (d.procesos || []).some((p) => isNum(p.costoRetrabajo)) },
      ],
    },
    embudos: {
      umbral: 0.45,
      reqs: [
        { n: 'etapas de embudo ≥3', peso: 3, ok: (d.embudo || []).length >= 3 },
        { n: 'valor unitario por conversión', peso: 2, ok: (d.embudo || []).some((e) => isNum(e.valorUnitario)) },
        { n: 'días por etapa', peso: 1, ok: (d.embudo || []).some((e) => isNum(e.diasEnEtapa)) },
        { n: 'restricciones de proceso', peso: 2, ok: (d.procesos || []).some((p) => isNum(p.capacidad)) },
      ],
    },
    gastos: {
      umbral: 0.40,
      reqs: [
        { n: 'partidas de gasto detalladas', peso: 3, ok: (d.gastos || []).length >= 5 },
        { n: 'gasto de operación agregado', peso: 2, ok: isNum(f.gastosOperacion) },
        { n: 'series históricas por partida', peso: 2, ok: (d.gastos || []).some((g) => clean(g.serie).length >= 6) },
        { n: 'driver de actividad por partida', peso: 2, ok: (d.gastos || []).some((g) => clean(g.driver).length >= 3) },
        { n: 'facturas individuales (Benford)', peso: 1, ok: (d.gastos || []).some((g) => clean(g.facturas).length >= 50) },
      ],
    },
    puestos: {
      umbral: 0.45,
      reqs: [
        { n: 'plantilla con costo anual', peso: 3, ok: (d.personal || []).filter((p) => isNum(p.costoAnual)).length >= 3 },
        { n: 'demanda de horas vs. contratadas', peso: 3, ok: (d.personal || []).some((p) => isNum(p.demandaHorasSemana) && isNum(p.horasSemana)) },
        { n: 'responsabilidades declaradas', peso: 2, ok: (d.personal || []).filter((p) => (p.responsabilidades || []).length).length >= 2 },
        { n: 'producción medible por puesto', peso: 2, ok: (d.personal || []).some((p) => isNum(p.produccion)) },
      ],
    },
    estructura: {
      umbral: 0.50,
      reqs: [
        { n: 'grafo de reporte (reportaA)', peso: 4, ok: (d.personal || []).filter((p) => p.reportaA).length >= 2 },
        { n: 'niveles jerárquicos', peso: 3, ok: (d.personal || []).some((p) => isNum(p.nivel)) },
        { n: 'costo por puesto', peso: 2, ok: (d.personal || []).some((p) => isNum(p.costoAnual)) },
      ],
    },
    comercial: {
      umbral: 0.40,
      reqs: [
        { n: 'CAC', peso: 3, ok: isNum(c.cac) },
        { n: 'margen bruto', peso: 2, ok: isNum(c.margenBrutoPct) },
        { n: 'ingreso por cliente', peso: 2, ok: isNum(c.ingresoPromedioCliente) },
        { n: 'churn', peso: 3, ok: isNum(c.churnMensual) },
        { n: 'cartera de clientes', peso: 1, ok: (c.clientes || []).length >= 3 },
        { n: 'desglose por canal', peso: 2, ok: (c.canales || []).length >= 2 },
      ],
    },
    financiero: {
      umbral: 0.35,
      reqs: [
        { n: 'estado de resultados básico', peso: 3, ok: isNum(f.ingresos) && isNum(f.costoVentas) && isNum(f.gastosOperacion) },
        { n: 'balance (activo/pasivo/capital)', peso: 3, ok: isNum(f.activoTotal) && isNum(f.pasivoTotal) && isNum(f.capitalContable) },
        { n: 'capital de trabajo', peso: 2, ok: isNum(f.activoCirculante) && isNum(f.pasivoCirculante) },
        { n: 'partidas de ciclo de efectivo', peso: 2, ok: isNum(f.cuentasPorCobrar) },
        { n: 'caja y quema', peso: 1, ok: isNum(f.efectivo) && isNum(f.quemaMensualNeta) },
      ],
    },
  };

  const out = {};
  Object.entries(dominios).forEach(([k, v]) => {
    const score = cobertura(v.reqs);
    const faltantes = v.reqs.filter((r) => !r.ok).map((r) => r.n);
    out[k] = {
      isd: round(score, 3),
      evaluable: score >= v.umbral,
      umbral: v.umbral,
      insumosPresentes: v.reqs.filter((r) => r.ok).map((r) => r.n),
      insumosFaltantes: faltantes,
      razon: score >= v.umbral ? null
        : `ISD ${round(score, 2)} < umbral ${v.umbral}. Faltan insumos críticos: ${faltantes.join('; ')}.`,
      // Factor de atenuación aplicado a la confianza de cada hallazgo del dominio.
      factorConfianza: round(Math.min(1, 0.55 + 0.45 * score), 3),
    };
  });
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. PERIODICIDAD
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Factor de anualización. Es el defecto más silencioso y más caro de un motor
 * de diagnóstico: si los volúmenes de un bloque son mensuales y se tratan como
 * anuales (o al revés), el impacto se equivoca por un factor de 12. Por eso la
 * periodicidad se declara de forma explícita por bloque y el motor emite una
 * advertencia cuando no se declaró.
 */
export const FACTOR_ANUAL = { semanal: 52, mensual: 12, bimestral: 6, trimestral: 4, semestral: 2, anual: 1 };

export function factorAnualizacion(periodicidad) {
  const f = FACTOR_ANUAL[String(periodicidad || '').toLowerCase()];
  return isNum(f) ? f : null;
}

/** Periodicidad declarada de un bloque, con su factor y el aviso si se asumió. */
export function periodicidadDe(d, bloque, porDefecto = 'mensual') {
  const decl = d?.empresa?.periodicidad?.[bloque];
  const f = factorAnualizacion(decl);
  if (f !== null) return { periodicidad: decl, factor: f, asumida: false };
  return {
    periodicidad: porDefecto, factor: FACTOR_ANUAL[porDefecto], asumida: true,
    aviso: `No se declaró empresa.periodicidad.${bloque}. Se asume "${porDefecto}" (factor ${FACTOR_ANUAL[porDefecto]}). Si los datos tienen otra periodicidad, los impactos de este bloque estarán escalados por un factor incorrecto.`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. NORMALIZACIÓN Y DERIVADOS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Calcula los campos derivados de uso transversal, sin mutar la entrada. */
export function normalizar(d) {
  const f = { ...(d.finanzas || {}) };
  if (isNum(f.ingresos) && isNum(f.costoVentas)) {
    f.utilidadBruta = f.ingresos - f.costoVentas;
    f.margenBruto = f.utilidadBruta / f.ingresos;
  }
  if (isNum(f.utilidadBruta) && isNum(f.gastosOperacion)) {
    f.ebit = isNum(d.finanzas?.ebit) ? d.finanzas.ebit : f.utilidadBruta - f.gastosOperacion;
    f.margenOperativo = f.ebit / f.ingresos;
  }
  if (isNum(f.activoCirculante) && isNum(f.pasivoCirculante)) {
    f.capitalTrabajo = f.activoCirculante - f.pasivoCirculante;
    f.razonCorriente = f.pasivoCirculante > 0 ? f.activoCirculante / f.pasivoCirculante : null;
    if (isNum(f.inventario))
      f.pruebaAcida = f.pasivoCirculante > 0 ? (f.activoCirculante - f.inventario) / f.pasivoCirculante : null;
  }
  if (isNum(f.ebit) && isNum(f.gastosFinancieros) && f.gastosFinancieros > 0)
    f.coberturaIntereses = f.ebit / f.gastosFinancieros;

  const personal = (d.personal || []).map((p) => ({
    ...p,
    costoMensual: isNum(p.costoAnual) ? p.costoAnual / 12 : null,
    utilizacion: isNum(p.demandaHorasSemana) && isNum(p.horasSemana) && p.horasSemana > 0
      ? p.demandaHorasSemana / p.horasSemana : null,
  }));

  return {
    ...d,
    finanzas: f,
    personal,
    empresa: {
      jurisdiccion: 'MX',
      tasaDescuento: 0.15,
      ...(d.empresa || {}),
      empleados: d.empresa?.empleados ?? personal.length ?? null,
    },
  };
}

export default { ESQUEMA, validar, indiceSuficiencia, normalizar };
