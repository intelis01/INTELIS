/**
 * INTELIS · Motor de Severidad, Cuantificación y Priorización
 * ─────────────────────────────────────────────────────────────────────────────
 * Detectar no es suficiente: veinte hallazgos sin jerarquía paralizan igual que
 * ninguno. Este módulo convierte cada hallazgo en una decisión ordenada.
 *
 * Cadena de razonamiento:
 *   hallazgo → impacto económico (Monte Carlo, no punto) → severidad FMEA
 *            → confianza (evidencia × suficiencia de datos) → prioridad
 *            → secuencia (sujeta a la restricción del sistema)
 */

import { monteCarlo, pert, clamp, round, isNum, npv, irr, paybackPeriod, sum } from './stats.js';

/* ═══════════════════════════════════════════════════════════════════════════
   1. ESCALAS FMEA
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Escalas 1–10 del Análisis de Modos de Falla y Efectos (AMEF/FMEA).
 * NPR = S × O × D. Referencia: AIAG-VDA FMEA Handbook (2019).
 * Se conserva el NPR clásico por su legibilidad, pero la priorización final
 * NO lo usa como único criterio: el NPR trata igual a 9×1×1 y 1×9×1, y eso es
 * erróneo. Por eso se combina con impacto económico y esfuerzo.
 */
export const ESCALA_SEVERIDAD = [
  { v: 10, etiqueta: 'Catastrófica',  criterio: 'Amenaza la continuidad del negocio, la seguridad de personas o implica responsabilidad penal.' },
  { v: 9,  etiqueta: 'Muy alta',      criterio: 'Pérdida >10% de ingresos anuales, o incumplimiento legal con sanción material.' },
  { v: 7,  etiqueta: 'Alta',          criterio: 'Pérdida entre 3% y 10% de ingresos, o deterioro estructural de la posición competitiva.' },
  { v: 5,  etiqueta: 'Moderada',      criterio: 'Pérdida entre 1% y 3% de ingresos, o fricción operativa sostenida.' },
  { v: 3,  etiqueta: 'Baja',          criterio: 'Pérdida entre 0.3% y 1% de ingresos, o ineficiencia localizada.' },
  { v: 1,  etiqueta: 'Mínima',        criterio: 'Pérdida <0.3% de ingresos, sin efecto perceptible en el cliente.' },
];

export const ESCALA_OCURRENCIA = [
  { v: 10, etiqueta: 'Permanente',   criterio: 'Presente en cada ciclo operativo; es el modo de operación actual.' },
  { v: 8,  etiqueta: 'Muy frecuente',criterio: 'Se manifiesta en más de la mitad de los ciclos.' },
  { v: 6,  etiqueta: 'Frecuente',    criterio: 'Se manifiesta en uno de cada cuatro ciclos aproximadamente.' },
  { v: 4,  etiqueta: 'Ocasional',    criterio: 'Se manifiesta en uno de cada veinte ciclos.' },
  { v: 2,  etiqueta: 'Rara',         criterio: 'Se manifiesta en menos de uno de cada cien ciclos.' },
  { v: 1,  etiqueta: 'Remota',       criterio: 'Evento aislado sin recurrencia observada.' },
];

export const ESCALA_DETECCION = [
  { v: 10, etiqueta: 'Nula',         criterio: 'No existe control alguno; el problema solo se conoce por sus consecuencias.' },
  { v: 8,  etiqueta: 'Muy baja',     criterio: 'Detección accidental o por queja de cliente.' },
  { v: 6,  etiqueta: 'Baja',         criterio: 'Revisión manual periódica, posterior al hecho.' },
  { v: 4,  etiqueta: 'Moderada',     criterio: 'Reporte recurrente que alguien debe interpretar.' },
  { v: 2,  etiqueta: 'Alta',         criterio: 'Control automatizado con alerta en el momento del evento.' },
  { v: 1,  etiqueta: 'Muy alta',     criterio: 'Control a prueba de error (poka-yoke): el fallo no puede ocurrir sin ser bloqueado.' },
];

/** Severidad derivada del impacto económico relativo a los ingresos. */
export function severidadPorImpacto(impactoAnual, ingresosAnuales, { legalPenal = false, seguridadPersonas = false } = {}) {
  if (legalPenal || seguridadPersonas) return 10;
  if (!(ingresosAnuales > 0) || !isNum(impactoAnual)) return 5;
  const r = Math.abs(impactoAnual) / ingresosAnuales;
  if (r >= 0.10) return 9;
  if (r >= 0.03) return 7;
  if (r >= 0.01) return 5;
  if (r >= 0.003) return 3;
  return 1;
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. CUANTIFICACIÓN DEL IMPACTO
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convierte una estimación de impacto en una distribución, no en un número.
 * Un informe que afirma "se pierden $847,320" miente por precisión espuria.
 * Este motor afirma: "P50 = $840k; intervalo P5–P95 = $520k–$1.21M".
 *
 * @param {Array<{min,mode,max,concepto}>} componentes
 * @param {number} seed  semilla para reproducibilidad
 */
export function cuantificar(componentes, seed = 20260921, iteraciones = 10000) {
  const comps = componentes.filter((c) => isNum(c.min) && isNum(c.mode) && isNum(c.max) && c.max >= c.min);
  if (!comps.length) {
    return { cuantificable: false, razon: 'Sin componentes con rango (min, moda, max) válido' };
  }
  const mc = monteCarlo(comps, iteraciones, seed);
  return {
    cuantificable: true,
    metodo: `Simulación Monte Carlo, ${iteraciones.toLocaleString('es-MX')} iteraciones sobre distribuciones PERT-Beta independientes (semilla ${seed}, reproducible)`,
    componentes: comps.map((c) => ({
      concepto: c.concepto,
      min: round(c.min), moda: round(c.mode), max: round(c.max),
      esperado: round(pert(c.min, c.mode, c.max).mu),
    })),
    p5: round(mc.p5), p25: round(mc.p25), p50: round(mc.p50),
    p75: round(mc.p75), p95: round(mc.p95),
    esperado: round(mc.mean), desviacion: round(mc.sd),
    // El sesgo advierte cuándo la media sobreestima el caso típico.
    sesgo: mc.mean > mc.p50 * 1.1 ? 'derecha (la media sobrestima el caso típico; usar P50)' :
           mc.mean < mc.p50 * 0.9 ? 'izquierda' : 'aproximadamente simétrico',
    supuestoClave: 'Los componentes se simulan como independientes. Si existe correlación positiva entre ellos, la dispersión real es MAYOR que la reportada y el P95 es conservador.',
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. CONFIANZA DEL HALLAZGO
   ═══════════════════════════════════════════════════════════════════════════ */

export const NIVEL_EVIDENCIA = {
  ESTADISTICA: { peso: 1.00, etiqueta: 'Prueba estadística', desc: 'Hallazgo sostenido por una prueba de hipótesis con p-valor y tamaño de efecto sobre datos del cliente.' },
  DETERMINISTA:{ peso: 0.95, etiqueta: 'Cálculo determinista', desc: 'Identidad contable o fórmula cerrada aplicada a datos verificados del cliente.' },
  MODELO:      { peso: 0.80, etiqueta: 'Modelo validado', desc: 'Modelo publicado y validado externamente (Altman, Erlang, Beneish) aplicado a datos del cliente.' },
  BENCHMARK:   { peso: 0.65, etiqueta: 'Comparación externa', desc: 'Desviación respecto de un benchmark sectorial documentado.' },
  CONVENCION:  { peso: 0.45, etiqueta: 'Convención profesional', desc: 'Umbral de práctica estándar sin estudio empírico único de respaldo.' },
  INDICIO:     { peso: 0.30, etiqueta: 'Indicio', desc: 'Señal que motiva investigación; insuficiente para decidir por sí sola.' },
};

/**
 * Confianza = peso(evidencia) × factorSuficienciaDeDatos × penalización(muestra)
 * Se reporta en tres bandas para evitar la falsa precisión de un decimal.
 */
export function confianza(nivelEvidencia, factorISD = 1, n = null, pValor = null) {
  const base = (NIVEL_EVIDENCIA[nivelEvidencia] || NIVEL_EVIDENCIA.INDICIO).peso;
  let penal = 1;
  if (isNum(n)) {
    if (n < 5) penal = 0.55;
    else if (n < 12) penal = 0.75;
    else if (n < 30) penal = 0.90;
  }
  let bonoP = 1;
  if (isNum(pValor)) {
    if (pValor < 0.001) bonoP = 1.08;
    else if (pValor < 0.01) bonoP = 1.04;
    else if (pValor > 0.05) bonoP = 0.70;
  }
  const score = clamp(base * factorISD * penal * bonoP, 0, 1);
  return {
    score: round(score, 3),
    banda: score >= 0.75 ? 'ALTA' : score >= 0.5 ? 'MEDIA' : 'BAJA',
    nivelEvidencia,
    etiquetaEvidencia: (NIVEL_EVIDENCIA[nivelEvidencia] || NIVEL_EVIDENCIA.INDICIO).etiqueta,
    descripcionEvidencia: (NIVEL_EVIDENCIA[nivelEvidencia] || NIVEL_EVIDENCIA.INDICIO).desc,
    n, pValor,
    factores: { evidencia: base, suficienciaDatos: round(factorISD, 3), muestra: penal, significancia: bonoP },
    lecturaRecomendada: score >= 0.75
      ? 'Base suficiente para decidir y ejecutar.'
      : score >= 0.5
        ? 'Base suficiente para investigar y planear; validar antes de comprometer capital.'
        : 'Indicio: solo justifica levantar datos adicionales. No decidir con esto.',
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. EVALUACIÓN ECONÓMICA DE LA SOLUCIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * VPN, TIR y recuperación de una solución, con su contingencia legal incluida
 * como flujo negativo. Omitir la contingencia es el error clásico que vuelve
 * rentable en papel una decisión que destruye valor en la realidad.
 *
 * @param {object} p
 *   inversionInicial  — desembolso en t=0 (positivo)
 *   beneficioAnual    — ahorro o ingreso incremental anual
 *   costoRecurrenteAnual — costo operativo adicional de la solución
 *   contingenciaLegal — pasivo esperado (se carga en t=0)
 *   horizonteAños, tasaDescuento, rampaMeses (curva de adopción)
 */
export function evaluarSolucion(p) {
  const {
    inversionInicial = 0, beneficioAnual = 0, costoRecurrenteAnual = 0,
    contingenciaLegal = 0, horizonteAños = 3, tasaDescuento = 0.15, rampaMeses = 0,
  } = p;

  const neto = beneficioAnual - costoRecurrenteAnual;
  const flujos = [-(inversionInicial + contingenciaLegal)];
  for (let t = 1; t <= horizonteAños; t++) {
    // Rampa lineal de adopción: el año 1 solo captura la fracción posterior al arranque.
    const factor = t === 1 && rampaMeses > 0 ? Math.max(0, (12 - rampaMeses) / 12) : 1;
    flujos.push(neto * factor);
  }
  const VPN = npv(tasaDescuento, flujos);
  const TIR = irr(flujos);
  const pb = paybackPeriod(flujos, tasaDescuento);
  const desembolso = inversionInicial + contingenciaLegal;

  return {
    flujos: flujos.map((x) => round(x)),
    vpn: round(VPN),
    tir: TIR === null ? null : round(TIR, 4),
    tirLegible: TIR === null ? 'no definida (sin cambio de signo en los flujos)' : `${round(TIR * 100, 1)}%`,
    paybackAños: pb === null ? null : round(pb, 2),
    roiPrimerAño: desembolso > 0 ? round(neto / desembolso, 3) : null,
    beneficioNetoAnual: round(neto),
    desembolsoTotal: round(desembolso),
    tasaDescuento, horizonteAños,
    veredicto: VPN > 0 && (TIR === null || TIR > tasaDescuento)
      ? 'Crea valor: VPN positivo a la tasa de descuento de la empresa.'
      : VPN > 0 ? 'VPN positivo pero TIR por debajo del costo de capital: revisar supuestos.'
      : 'Destruye valor con los supuestos actuales: NO ejecutar sin renegociar costos o ampliar beneficio.',
    advertencia: contingenciaLegal > 0
      ? `La evaluación incluye ${round(contingenciaLegal)} de contingencia legal esperada cargada en t=0. Si la contingencia se materializa por encima de ese monto, el VPN se deteriora en la misma proporción.`
      : null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. PRIORIZACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */

export const ESFUERZO = {
  1: { etiqueta: 'Trivial',  desc: 'Días; sin inversión ni cambio de proceso.' },
  2: { etiqueta: 'Bajo',     desc: 'Semanas; ajuste de proceso con recursos existentes.' },
  3: { etiqueta: 'Medio',    desc: 'Uno a tres meses; requiere coordinación entre áreas.' },
  5: { etiqueta: 'Alto',     desc: 'Tres a seis meses; inversión y cambio organizacional.' },
  8: { etiqueta: 'Mayor',    desc: 'Más de seis meses; transformación estructural con riesgo de ejecución.' },
};

/**
 * Índice de Prioridad INTELIS (IPI).
 *
 *   IPI = (Impacto_norm × Confianza × Severidad_norm × Apalancamiento) / Esfuerzo^0.5
 *
 * Justificación de cada factor:
 *   · Impacto_norm  — impacto P50 relativo al mayor hallazgo, en [0,1].
 *   · Confianza     — no se prioriza lo que no se sabe.
 *   · Severidad_norm— consecuencia, no solo magnitud monetaria.
 *   · Apalancamiento— 2.0 si el hallazgo ES la restricción del sistema, 1.0 si no.
 *     Fundamento: Teoría de Restricciones (Goldratt, 1984). Mejorar una no-
 *     restricción NO mejora el desempeño global del sistema; en el mejor caso
 *     genera inventario, en el peor, costo. Esta es la corrección más importante
 *     frente a un ranking ingenuo por monto.
 *   · Esfuerzo^0.5  — raíz, no lineal: penaliza lo costoso sin hacer que lo
 *     trivial domine siempre el ranking.
 */
export function prioridad({ impactoP50, impactoMaximo, confianzaScore, severidad, esfuerzo = 3, esRestriccion = false, bloqueaLegal = false, cuantificado = true }) {
  // Normalización LOGARÍTMICA del impacto, no lineal.
  // Motivo: la distribución de impactos es de cola pesada. Con normalización
  // lineal, un solo hallazgo grande aplasta a todos los demás hacia cero y el
  // ranking deja de discriminar entre el segundo y el trigésimo. La escala
  // logarítmica preserva el orden y conserva poder de discriminación en toda
  // la distribución, que es justamente para lo que sirve un ranking.
  //
  // PISO PARA HALLAZGOS NO CUANTIFICADOS. Un hallazgo cuyo impacto no se pudo
  // cifrar no vale cero: simplemente no se pudo medir. Dejarlo caer al fondo del
  // ranking haría que la ausencia de datos se disfrazara de ausencia de
  // importancia — exactamente el error que el resto del motor está diseñado para
  // evitar. Recibe un impacto normalizado de referencia y su severidad y su
  // confianza siguen modulando el resultado.
  const IMP_REFERENCIA_NO_CUANTIFICADO = 0.35;
  const impN = !cuantificado
    ? IMP_REFERENCIA_NO_CUANTIFICADO
    : impactoMaximo > 0
      ? clamp(Math.log1p(Math.abs(impactoP50)) / Math.log1p(impactoMaximo), 0, 1)
      : 0;
  const sevN = clamp(severidad / 10, 0, 1);
  const apal = esRestriccion ? 2.0 : 1.0;
  const base = (impN * confianzaScore * sevN * apal) / Math.sqrt(Math.max(1, esfuerzo));
  // Un incumplimiento legal vigente no compite por ROI: se atiende.
  const ipi = bloqueaLegal ? Math.max(base, 0.95) : base;
  return {
    ipi: round(ipi, 4),
    clase: bloqueaLegal ? 'CUMPLIMIENTO OBLIGATORIO'
      : ipi >= 0.45 ? 'CRÍTICA'
      : ipi >= 0.22 ? 'ALTA'
      : ipi >= 0.10 ? 'MEDIA' : 'BAJA',
    factores: {
      impactoNormalizado: round(impN, 3), impactoCuantificado: cuantificado,
      confianza: round(confianzaScore, 3),
      severidadNormalizada: round(sevN, 3), apalancamientoTOC: apal,
      esfuerzo, esfuerzoEtiqueta: (ESFUERZO[esfuerzo] || {}).etiqueta ?? String(esfuerzo),
    },
    formula: 'IPI = (Impacto_norm × Confianza × Severidad_norm × Apalancamiento_TOC) / √Esfuerzo, con Impacto_norm = ln(1+impacto)/ln(1+impacto_máx) para conservar discriminación en una distribución de cola pesada',
    notaCuantificacion: cuantificado ? null
      : `Impacto no cuantificado: se asigna un valor normalizado de referencia (${IMP_REFERENCIA_NO_CUANTIFICADO}) para que el hallazgo no se hunda en el ranking por falta de datos. Su posición depende entonces de su severidad y su confianza. Cifrar este impacto debería ser una prioridad de levantamiento de información.`,
    notaTOC: esRestriccion
      ? 'Este hallazgo ocurre EN la restricción del sistema. Por el teorema de la cadena (Goldratt), una hora ganada aquí es una hora ganada por todo el sistema.'
      : 'Este hallazgo NO ocurre en la restricción. Resolverlo mejora la economía local, pero no elevará el throughput global mientras la restricción no se atienda.',
  };
}

/**
 * Ordena los hallazgos y construye la secuencia de ejecución por olas.
 * La secuencia no es el ranking: respeta dependencias y capacidad de cambio.
 */
export function secuenciar(hallazgos, { capacidadParalela = 3 } = {}) {
  const orden = [...hallazgos].sort((a, b) => {
    const ca = a.prioridad?.clase === 'CUMPLIMIENTO OBLIGATORIO' ? 1 : 0;
    const cb = b.prioridad?.clase === 'CUMPLIMIENTO OBLIGATORIO' ? 1 : 0;
    if (ca !== cb) return cb - ca;
    return (b.prioridad?.ipi ?? 0) - (a.prioridad?.ipi ?? 0);
  });

  // Capacidad de cambio por ola, en puntos de esfuerzo. Deliberadamente acotada:
  // una organización no puede absorber un número ilimitado de cambios en paralelo.
  const capacidadPorOla = capacidadParalela * 3;
  const MAX_OLAS = 4;

  const olas = [];
  let actual = [], usado = 0;
  const cartera = [];

  orden.forEach((h) => {
    const e = h.solucion?.esfuerzo ?? 3;
    if (olas.length >= MAX_OLAS) { cartera.push(h); return; }
    if (usado + e > capacidadPorOla && actual.length) {
      olas.push(actual); actual = []; usado = 0;
      if (olas.length >= MAX_OLAS) { cartera.push(h); return; }
    }
    actual.push(h); usado += e;
  });
  if (actual.length && olas.length < MAX_OLAS) olas.push(actual);
  else if (actual.length) actual.forEach((h) => cartera.push(h));

  const HORIZONTES = ['0–90 días', '90–180 días', '180–270 días', '270–360 días'];

  return {
    ranking: orden,
    capacidadPorOla,
    olas: olas.map((o, i) => ({
      ola: i + 1,
      horizonte: HORIZONTES[i] ?? `${i * 90}–${(i + 1) * 90} días`,
      hallazgos: o.map((h) => h.id),
      esfuerzoComprometido: sum(o.map((h) => h.solucion?.esfuerzo ?? 3)),
      impactoP50Acumulado: round(sum(o.map((h) => h.impacto?.p50 ?? 0))),
      criterio: i === 0
        ? 'Cumplimiento obligatorio, restricción del sistema y alto impacto de bajo esfuerzo.'
        : 'Depende de la estabilización lograda en la ola anterior.',
    })),
    cartera: {
      n: cartera.length,
      hallazgos: cartera.map((h) => h.id),
      impactoP50Acumulado: round(sum(cartera.map((h) => h.impacto?.p50 ?? 0))),
      criterio:
        'Hallazgos válidos que exceden la capacidad de absorción de cambio del primer año. NO se descartan: se reevalúan ' +
        'al cierre de cada ola, porque la ejecución de las olas anteriores cambia tanto la restricción del sistema como ' +
        'la prioridad relativa de lo que queda.',
    },
    principioDeSecuencia:
      'Las olas respetan la capacidad de absorción de cambio de la organización. Ejecutar todo simultáneamente es la causa ' +
      'más común de que un diagnóstico correcto no produzca ningún resultado. Un plan con catorce frentes abiertos no es un ' +
      'plan: es una lista de deseos.',
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. AGREGACIÓN CON CONTROL DE SOLAPAMIENTO
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Familias de hallazgos que comparten causa raíz o compiten por la misma bolsa
 * de valor. Sumar sus impactos cuenta el mismo peso dos o tres veces.
 *
 * Ejemplo concreto: la fuga del embudo y la restricción del sistema describen,
 * desde dos ángulos distintos, el mismo negocio nuevo que no se está cerrando.
 * Sumarlos duplica la oportunidad. La regla conservadora es tomar el MÁXIMO de
 * la familia, no la suma: se pierde algo de oportunidad real, pero se evita
 * comprometer ante la dirección una cifra que no resistiría el primer escrutinio.
 */
export const FAMILIAS_SOLAPAMIENTO = [
  {
    clave: 'throughput_comercial',
    nombre: 'Negocio nuevo no capturado',
    tipos: ['fuga_embudo', 'restriccion_sistema'],
    razon: 'Ambos describen el mismo negocio que no se cierra: el embudo lo mide por conversión y la restricción por capacidad de procesamiento. El valor recuperable es el mismo peso visto dos veces.',
  },
  {
    clave: 'motor_de_valor_cliente',
    nombre: 'Economía del ciclo de vida del cliente',
    tipos: ['economia_unitaria_insuficiente', 'subinversion_comercial', 'fuga_retencion', 'concentracion_cartera', 'equilibrio_crecimiento_rentabilidad'],
    razon: 'Todos operan sobre las mismas variables (LTV, CAC, churn, cartera). Mejorar la retención ya modifica el LTV que alimenta al cálculo de economía unitaria: contarlos por separado duplica el mismo efecto.',
  },
  {
    clave: 'bolsa_laboral',
    nombre: 'Costo laboral y diseño organizacional',
    tipos: ['capacidad_sobrante', 'capa_parasitaria', 'jerarquia_inflada', 'brecha_eficiencia', 'duplicidad_responsabilidades', 'tramo_excesivo'],
    razon: 'Compiten por la misma bolsa de costo laboral. La capacidad sobrante de un puesto y la capa parasitaria que lo supervisa pueden ser, literalmente, el mismo dinero.',
  },
  {
    clave: 'bolsa_de_gasto',
    nombre: 'Gasto operativo',
    tipos: ['gasto_sin_driver', 'concentracion_gasto', 'gasto_atipico', 'desacople_gasto_ingreso', 'anomalia_benford'],
    razon: 'La renegociación de clase A ya incluye partidas que aparecen además como gasto sin driver o como atípicas. Sumar el ahorro de ambas rutas cuenta dos veces el mismo peso.',
  },
  {
    clave: 'calidad_operativa',
    nombre: 'Calidad y estabilidad de proceso',
    tipos: ['proceso_fuera_de_control', 'proceso_estable_incapaz', 'nivel_calidad_deficiente', 'deriva_proceso', 'variabilidad_excesiva'],
    razon: 'Distintas mediciones del mismo defecto de proceso. El retrabajo que cuenta la carta de control es el mismo que cuenta el DPMO.',
  },
  {
    clave: 'liquidez',
    nombre: 'Liquidez y capital de trabajo',
    tipos: ['ciclo_efectivo_extenso', 'runway_insuficiente'],
    razon: 'La caja liberada al acortar el ciclo ES la que extiende el horizonte de liquidez. Es un solo peso, contado en dos indicadores.',
  },
];

/**
 * Agrega impactos controlando el solapamiento.
 * Devuelve el agregado ingenuo (suma), el agregado conservador (máximo por
 * familia + suma de los no agrupados) y el detalle de lo descontado.
 */
export function agregarConSolapamiento(hallazgos) {
  const q = hallazgos.filter((h) => h.impacto?.cuantificable);
  const sumaIngenua = sum(q.map((h) => h.impacto.p50));

  const asignados = new Set();
  const familias = FAMILIAS_SOLAPAMIENTO.map((f) => {
    const miembros = q.filter((h) => f.tipos.includes(h.tipo));
    miembros.forEach((h) => asignados.add(h.id));
    const suma = sum(miembros.map((h) => h.impacto.p50));
    const maximo = miembros.length ? Math.max(...miembros.map((h) => h.impacto.p50)) : 0;
    return {
      ...f, n: miembros.length,
      miembros: miembros.map((h) => ({ id: h.id, tipo: h.tipo, p50: round(h.impacto.p50) })),
      sumaDeLaFamilia: round(suma),
      reconocido: round(maximo),
      descontado: round(suma - maximo),
    };
  }).filter((f) => f.n > 0);

  const sueltos = q.filter((h) => !asignados.has(h.id));
  const reconocido = sum(familias.map((f) => f.reconocido)) + sum(sueltos.map((h) => h.impacto.p50));
  const descontado = sumaIngenua - reconocido;

  return {
    sumaIngenua: round(sumaIngenua),
    agregadoConservador: round(reconocido),
    descontadoPorSolapamiento: round(descontado),
    pctDescontado: sumaIngenua > 0 ? round(descontado / sumaIngenua, 4) : 0,
    familias,
    hallazgosIndependientes: sueltos.length,
    reglaAplicada:
      'Dentro de cada familia de causa raíz compartida se reconoce únicamente el MÁXIMO, no la suma. ' +
      'Es deliberadamente conservador: subestima la oportunidad real antes que sobrestimarla. ' +
      'La cifra que se comunica a la dirección debe ser el agregado conservador; la suma ingenua solo sirve ' +
      'para dimensionar el techo teórico.',
    advertencia:
      'Aun el agregado conservador supone que los hallazgos de familias DISTINTAS son independientes entre sí. ' +
      'Si dos familias comparten una causa raíz no modelada aquí, persiste doble conteo residual.',
  };
}

export default { cuantificar, confianza, evaluarSolucion, prioridad, secuenciar, severidadPorImpacto, agregarConSolapamiento };
