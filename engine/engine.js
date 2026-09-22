/**
 * INTELIS · Motor de Diagnóstico Organizacional (MDO)
 * ─────────────────────────────────────────────────────────────────────────────
 * Orquestador. Ejecuta la cadena completa:
 *
 *   datos → validación → índice de suficiencia → 7 detectores
 *         → cuantificación → soluciones sustentadas → priorización → secuencia
 *
 * Garantías del motor:
 *   · DETERMINISMO — misma entrada y misma semilla producen el mismo informe,
 *     bit a bit. Un diagnóstico que no se puede reproducir no se puede auditar.
 *   · ABSTENCIÓN INFORMADA — un dominio sin datos suficientes se declara no
 *     evaluado, nunca "sin hallazgos".
 *   · TRAZABILIDAD — todo número del informe tiene su fórmula y sus insumos.
 */

import { validar, indiceSuficiencia, normalizar } from './core/schema.js';
import { resetSeq, setSeed } from './detectors/_base.js';
import { detectarProcesos }   from './detectors/d1-procesos.js';
import { detectarEmbudos }    from './detectors/d2-embudos.js';
import { detectarGastos }     from './detectors/d3-gastos.js';
import { detectarPuestos }    from './detectors/d4-puestos.js';
import { detectarEstructura } from './detectors/d5-estructura.js';
import { detectarComercial }  from './detectors/d6-comercial.js';
import { detectarFinanciero } from './detectors/d7-financiero.js';
import { resolverTodos }      from './solutions/resolver.js';
import { secuenciar, agregarConSolapamiento } from './core/scoring.js';
import { fuentesVencidas, inventarioFuentes } from './data/benchmarks.js';
import { normasPorVerificar, DISCLAIMER, CORTE_NORMATIVO } from './data/legal-mx.js';
import { round, sum } from './core/stats.js';

export const VERSION = '1.0.0';

const DETECTORES = [
  { clave: 'procesos',   nombre: 'Errores y fallos de proceso',        fn: detectarProcesos },
  { clave: 'embudos',    nombre: 'Embudos y cuellos de botella',       fn: detectarEmbudos },
  { clave: 'gastos',     nombre: 'Gastos innecesarios y fugas',        fn: detectarGastos },
  { clave: 'puestos',    nombre: 'Capacidad de plantilla mal asignada',fn: detectarPuestos },
  { clave: 'estructura', nombre: 'Estructuras organizacionales fallidas', fn: detectarEstructura },
  { clave: 'comercial',  nombre: 'Estrategias comerciales erróneas',   fn: detectarComercial },
  { clave: 'financiero', nombre: 'Solvencia, liquidez y señales forenses', fn: detectarFinanciero },
];

/**
 * Ejecuta el diagnóstico completo.
 * @param {object} datos  dataset conforme a engine/core/schema.js
 * @param {object} opciones { semilla, capturaSupuesta, horizonteAños, capacidadParalela, hoy }
 */
export function diagnosticar(datos, opciones = {}) {
  const t0 = Date.now();
  const semilla = opciones.semilla ?? 20260921;
  const hoy = opciones.hoy ?? new Date();
  resetSeq();
  setSeed(semilla);

  /* ── 1. Validación ─────────────────────────────────────────────── */
  const validacion = validar(datos);
  if (validacion.errores.some((e) => e.campo === 'raiz' || e.campo === 'empresa' || e.campo === 'finanzas')) {
    return {
      ejecutado: false,
      version: VERSION,
      razon: 'El dataset carece de los bloques mínimos (empresa, finanzas). El motor se abstiene de ejecutar.',
      validacion,
    };
  }

  /* ── 2. Normalización y suficiencia ────────────────────────────── */
  const d = normalizar(datos);
  const isd = indiceSuficiencia(d);

  /* ── 3. Detección ──────────────────────────────────────────────── */
  const dominios = {};
  const errores = [];
  DETECTORES.forEach(({ clave, nombre, fn }) => {
    try {
      dominios[clave] = { nombre, ...fn(d, isd) };
    } catch (e) {
      errores.push({ dominio: clave, error: e.message });
      dominios[clave] = { nombre, dominio: clave, evaluado: false, hallazgos: [], razonNoEvaluado: `Error de ejecución: ${e.message}` };
    }
  });

  const hallazgosCrudos = Object.values(dominios).flatMap((x) => x.hallazgos || []);

  /* ── 3b. Propagación del apalancamiento de la restricción ───────── */
  // La Teoría de Restricciones no dice "la etapa saturada es importante": dice
  // que TODA mejora aplicada a la restricción se traduce en mejora del sistema,
  // y que toda mejora fuera de ella no. Por eso el flag debe marcar cualquier
  // hallazgo que ocurra EN la etapa restrictiva — un defecto de calidad en la
  // restricción es más valioso de corregir que el mismo defecto en otra etapa,
  // porque cada unidad que la restricción desperdicia es una unidad que el
  // sistema entero nunca produce.
  const etapaRestriccion = dominios.embudos?.restriccionIdentificada ?? null;
  if (etapaRestriccion) {
    hallazgosCrudos.forEach((h) => {
      if (h.contexto?.etapa === etapaRestriccion) h.esRestriccion = true;
    });
  }

  /* ── 4. Soluciones sustentadas y priorización ──────────────────── */
  const hallazgos = resolverTodos(hallazgosCrudos, d, {
    capturaSupuesta: opciones.capturaSupuesta ?? 0.70,
    horizonteAños: opciones.horizonteAños ?? 3,
  });

  /* ── 5. Secuencia de ejecución ─────────────────────────────────── */
  const plan = secuenciar(hallazgos, { capacidadParalela: opciones.capacidadParalela ?? 3 });

  /* ── 6. Agregados ──────────────────────────────────────────────── */
  const cuantificados = hallazgos.filter((h) => h.impacto?.cuantificable);
  const agregado = agregarConSolapamiento(hallazgos);
  const impactoP50 = agregado.agregadoConservador;
  const impactoP50Ingenuo = agregado.sumaIngenua;
  const impactoP5  = sum(cuantificados.map((h) => h.impacto.p5));
  const impactoP95 = sum(cuantificados.map((h) => h.impacto.p95));
  const inversionTotal = sum(hallazgos.map((h) => h.solucion?.sustentos?.financiero?.inversionEstimada?.tipica ?? 0));
  const vpnTotal = sum(hallazgos.map((h) => h.solucion?.sustentos?.financiero?.evaluacion?.vpn ?? 0));
  const ingresos = d.finanzas?.ingresos ?? 0;

  const porDominio = Object.entries(dominios).map(([clave, v]) => ({
    dominio: clave, nombre: v.nombre, evaluado: v.evaluado,
    hallazgos: (v.hallazgos || []).length,
    impactoP50: round(sum((v.hallazgos || []).filter((h) => h.impacto?.cuantificable).map((h) => h.impacto.p50))),
    isd: isd[clave]?.isd ?? null,
    razonNoEvaluado: v.razonNoEvaluado ?? null,
  }));

  const noEvaluados = porDominio.filter((x) => !x.evaluado);

  /* ── 7. Advertencias de integridad del informe ─────────────────── */
  const advertencias = [];
  const vencidas = fuentesVencidas(hoy);
  if (vencidas.length) advertencias.push({
    tipo: 'fuentes_vencidas', severidad: 'media',
    mensaje: `${vencidas.length} fuente(s) externa(s) superaron su fecha de re-verificación y deben cotejarse contra la fuente primaria.`,
    detalle: vencidas,
  });
  const porVerificar = normasPorVerificar();
  if (porVerificar.length) advertencias.push({
    tipo: 'normas_por_verificar', severidad: 'alta',
    mensaje: `${porVerificar.length} referencia(s) normativa(s) requieren verificación de vigencia en el DOF antes de fundamentar cualquier acción.`,
    detalle: porVerificar,
  });
  if (noEvaluados.length) advertencias.push({
    tipo: 'dominios_sin_datos', severidad: 'alta',
    mensaje: `${noEvaluados.length} de ${DETECTORES.length} dominios NO se evaluaron por insuficiencia de datos. Esto es ausencia de información, no ausencia de problemas.`,
    detalle: noEvaluados.map((x) => ({ dominio: x.dominio, nombre: x.nombre, isd: x.isd, razon: x.razonNoEvaluado })),
  });
  if (validacion.errores.length) advertencias.push({
    tipo: 'errores_de_datos', severidad: 'alta',
    mensaje: `${validacion.errores.length} inconsistencia(s) en los datos de entrada. Los dominios afectados pueden arrojar resultados erróneos.`,
    detalle: validacion.errores,
  });
  // Prueba de plausibilidad del agregado. Un impacto identificado que se acerca
  // o supera al ingreso anual es matemáticamente posible solo en casos extremos;
  // lo habitual es que indique doble conteo entre hallazgos con causa raíz común,
  // o un error de factor de anualización. El motor lo declara en lugar de
  // presentar una cifra impresionante que no resistiría el primer escrutinio.
  const ratioAgregado = ingresos > 0 ? impactoP50 / ingresos : null;
  if (ratioAgregado !== null && ratioAgregado > 0.35) advertencias.push({
    tipo: 'agregado_implausible',
    severidad: ratioAgregado > 0.60 ? 'alta' : 'media',
    mensaje:
      `El impacto agregado (P50) equivale al ${round(ratioAgregado * 100, 1)}% de los ingresos anuales. ` +
      `Un agregado por encima del 35% casi siempre indica doble conteo entre hallazgos que comparten causa raíz, ` +
      `o un factor de anualización mal declarado, antes que una oportunidad real de esa magnitud. ` +
      `NO comunicar esta cifra sin antes depurar solapamientos hallazgo por hallazgo.`,
    detalle: {
      impactoP50: round(impactoP50), ingresos: round(ingresos), ratio: round(ratioAgregado, 4),
      revisarPrimero: cuantificados
        .sort((a, b) => b.impacto.p50 - a.impacto.p50).slice(0, 5)
        .map((h) => ({ id: h.id, dominio: h.dominio, titulo: h.titulo, p50: h.impacto.p50 })),
      periodicidadDeclarada: d.empresa?.periodicidad ?? 'NO DECLARADA — riesgo de error por factor 12',
    },
  });

  const solIncompletas = hallazgos.filter((h) => h.solucion && !h.solucion.completa);
  if (solIncompletas.length) advertencias.push({
    tipo: 'soluciones_incompletas', severidad: 'media',
    mensaje: `${solIncompletas.length} solución(es) no alcanzaron sustento completo en los siete campos.`,
    detalle: solIncompletas.map((h) => ({ hallazgo: h.id, campos: h.solucion.camposIncompletos })),
  });

  return {
    ejecutado: true,
    version: VERSION,
    generadoEn: hoy.toISOString(),
    semilla,
    reproducible: true,
    duracionMs: Date.now() - t0,

    empresa: {
      nombre: d.empresa?.nombre, sector: d.empresa?.sector,
      periodo: d.empresa?.periodo, moneda: d.empresa?.moneda,
      jurisdiccion: d.empresa?.jurisdiccion ?? 'MX',
      ingresos: round(ingresos), empleados: d.empresa?.empleados,
      tasaDescuento: d.empresa?.tasaDescuento,
    },

    resumen: {
      dominiosEvaluados: porDominio.filter((x) => x.evaluado).length,
      dominiosTotales: DETECTORES.length,
      hallazgosTotales: hallazgos.length,
      hallazgosCuantificados: cuantificados.length,
      porClase: ['CUMPLIMIENTO OBLIGATORIO', 'CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'].map((c) => ({
        clase: c, n: hallazgos.filter((h) => h.prioridad?.clase === c).length,
      })),
      porConfianza: ['ALTA', 'MEDIA', 'BAJA'].map((b) => ({
        banda: b, n: hallazgos.filter((h) => h.confianza?.banda === b).length,
      })),
      impactoAnualIdentificado: {
        // Cifra a comunicar: el agregado CONSERVADOR, ya desduplicado.
        p50: round(impactoP50),
        comoPctIngresos: ingresos > 0 ? round(impactoP50 / ingresos, 4) : null,
        // El rango P5–P95 se escala proporcionalmente al descuento aplicado,
        // para que el intervalo siga siendo coherente con el punto central.
        p5: round(impactoP5 * (impactoP50Ingenuo > 0 ? impactoP50 / impactoP50Ingenuo : 1)),
        p95: round(impactoP95 * (impactoP50Ingenuo > 0 ? impactoP50 / impactoP50Ingenuo : 1)),
        sumaIngenuaSinDesduplicar: round(impactoP50Ingenuo),
        controlDeSolapamiento: agregado,
        nota: 'La cifra principal es el agregado CONSERVADOR: dentro de cada familia de causa raíz compartida se reconoce solo el hallazgo de mayor impacto, no la suma. Comunicar la suma ingenua a la dirección sería sobrestimar la oportunidad.',
      },
      inversionRequeridaEstimada: round(inversionTotal),
      vpnAgregado: round(vpnTotal),
      restriccionDelSistema: etapaRestriccion,
      hallazgosEnLaRestriccion: hallazgos.filter((h) => h.esRestriccion).length,
      notaTOC: etapaRestriccion
        ? `La etapa "${etapaRestriccion}" gobierna el throughput del sistema. Los hallazgos que ocurren en ella reciben el doble de apalancamiento en la priorización, porque una mejora ahí se traduce en mejora del sistema completo; la misma mejora en otra etapa no lo hace.`
        : 'No se identificó una restricción de capacidad: no se aportaron al menos dos etapas con tasa de llegada y capacidad declaradas.',
    },

    validacion,
    suficienciaDeDatos: isd,
    dominios,
    hallazgos,
    plan,
    advertencias,
    erroresDeEjecucion: errores,

    marcoDeIntegridad: {
      disclaimerJuridico: DISCLAIMER.texto,
      corteNormativo: CORTE_NORMATIVO,
      totalFuentesExternas: inventarioFuentes().length,
      principios: [
        'Determinismo: misma entrada y misma semilla producen el mismo informe. Todo resultado es re-auditable.',
        'Abstención informada: un dominio sin datos se declara no evaluado, nunca sin hallazgos.',
        'Trazabilidad: cada número tiene su fórmula, sus insumos y su fuente declarados.',
        'Rango sobre punto: los impactos se expresan como intervalos, no como cifras falsamente precisas.',
        'Sustento séptuple: ninguna solución se emite sin sus siete campos de fundamento, o sin declarar cuál falta.',
        'Subordinación a la restricción: la priorización pondera el apalancamiento sistémico, no solo el monto.',
      ],
      limitacionesEstructurales: [
        'El motor opera exclusivamente sobre los datos que recibe. No verifica su veracidad ni su representatividad.',
        'No sustituye el juicio de la dirección ni la asesoría profesional jurídica, contable o médica.',
        'Los benchmarks externos provienen de poblaciones distintas a esta empresa y orientan, no determinan.',
        'La correlación estadística no establece causalidad. Los hallazgos señalan dónde mirar, no qué concluir.',
        'El agregado de impactos asume independencia entre hallazgos; los solapamientos deben validarse manualmente.',
      ],
    },
  };
}

export default { diagnosticar, VERSION };
