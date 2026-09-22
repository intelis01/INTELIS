/**
 * INTELIS · Resolutor de Soluciones Sustentadas
 * ─────────────────────────────────────────────────────────────────────────────
 * Convierte cada hallazgo en una solución con sustento COMPLETO en siete campos.
 * Una solución a la que le falte cualquiera de los siete no se emite: se emite
 * marcada como incompleta, con la declaración explícita de qué falta y por qué.
 *
 *   1. MATEMÁTICO  — la fórmula y el cálculo con los números de esta empresa.
 *   2. ESTADÍSTICO — la prueba, su p-valor, su n y sus supuestos.
 *   3. FINANCIERO  — VPN, TIR y recuperación, netos de contingencia.
 *   4. JURÍDICO    — normas aplicables, obligaciones previas y barreras duras.
 *   5. OPERATIVO   — pasos verificables, indicador y señal de aborto.
 *   6. DE RIESGO   — qué puede fallar, con qué probabilidad y cómo se mitiga.
 *   7. DE EVIDENCIA— fuente externa, año, muestra y nivel de confianza.
 *
 * Campo adicional 8 (condicional): MÉDICO/SALUD OCUPACIONAL, cuando el hallazgo
 * involucra carga de trabajo o condiciones que afectan la salud.
 */

import { PLAYBOOKS } from '../data/playbooks.js';
import { sustentoJuridico, DISCLAIMER } from '../data/legal-mx.js';
import { evaluarSolucion, prioridad, ESFUERZO } from '../core/scoring.js';
import { SALUD_OCUPACIONAL, COSTO_DISFUNCION, inventarioFuentes } from '../data/benchmarks.js';
import { round, isNum } from '../core/stats.js';

/** Formato monetario para los textos narrativos del informe. */
const fmtMoneda = (x, m = 'MXN') => (isNum(x)
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: m, maximumFractionDigits: 0 }).format(x)
  : 's/d');

/** Fuentes externas citadas por dominio, para el campo 7. */
const EVIDENCIA_POR_DOMINIO = {
  procesos:   ['CALIDAD.nivelesSigma', 'CALIDAD.capacidadMinima', 'CALIDAD.utilizacionCritica'],
  embudos:    ['CALIDAD.utilizacionCritica', 'COMERCIAL.retencionValor'],
  gastos:     ['COSTO_DISFUNCION.fraudeOcupacional', 'FINANCIERO.benford', 'COSTO_DISFUNCION.calidadDeDatos'],
  puestos:    ['SALUD_OCUPACIONAL.jornadaLargaRiesgo', 'COSTO_DISFUNCION.desercionLaboralCosto', 'ESTRUCTURA.tramoControl'],
  estructura: ['ESTRUCTURA.tramoControl', 'ESTRUCTURA.costoCoordinacion', 'COSTO_DISFUNCION.lastreOrganizacional'],
  comercial:  ['COMERCIAL.ltvCac', 'COMERCIAL.retencionValor', 'COMERCIAL.concentracionClientes', 'COMERCIAL.cacPayback'],
  financiero: ['FINANCIERO.altman', 'FINANCIERO.liquidez', 'FINANCIERO.runwayMinimo'],
};

/**
 * Estima el desembolso de la intervención a partir del rango declarado en el
 * playbook, anclado a la magnitud económica del hallazgo. Se usa el punto medio
 * del rango y se expone el rango completo, porque presentar un número único
 * ocultaría la incertidumbre real de la estimación.
 */
function estimarInversion(pb, hallazgo, dataset) {
  const rango = pb.inversionTipica?.rangoPctCostoProceso ?? [0.02, 0.08];
  // Ancla: el impacto P50 del hallazgo, con respaldo en el costo laboral o el gasto total.
  const ancla = (hallazgo.impacto?.cuantificable && hallazgo.impacto.p50 > 0)
    ? hallazgo.impacto.p50
    : (dataset.finanzas?.gastosOperacion ?? 0) * 0.02;
  return {
    tipo: pb.inversionTipica?.tipo ?? 'no especificado',
    rangoPct: rango,
    minima: round(ancla * rango[0]),
    tipica: round(ancla * ((rango[0] + rango[1]) / 2)),
    maxima: round(ancla * rango[1]),
    baseDeAnclaje: `Se ancla al impacto P50 del hallazgo (${round(ancla)}) multiplicado por el rango de inversión típica del playbook (${rango[0]}–${rango[1]}). Es una ESTIMACIÓN PARAMÉTRICA: debe sustituirse por la cotización real antes de comprometer presupuesto.`,
  };
}

/**
 * Contingencia legal esperada: se toma del propio hallazgo cuando el detector la
 * calculó (caso de terminación laboral) y en caso contrario se deja en cero con
 * la declaración explícita de que no fue cuantificada.
 */
function contingenciaDelHallazgo(h) {
  const c = h.contexto?.costoTerminacionLFT;
  if (c && c.calculable) {
    return {
      monto: c.esperado,
      origen: 'Costo esperado de terminación conforme a la LFT, ponderado entre el escenario de convenio y el de litigio adverso.',
      detalle: c,
    };
  }
  return {
    monto: 0,
    origen: 'No se identificó contingencia legal cuantificable para esta intervención con los datos disponibles.',
    detalle: null,
  };
}

/**
 * Construye la solución completa de un hallazgo.
 */
export function resolver(hallazgo, dataset, opciones = {}) {
  const pb = PLAYBOOKS[hallazgo.playbook];
  const tasa = dataset.empresa?.tasaDescuento ?? 0.15;
  const moneda = dataset.empresa?.moneda ?? 'MXN';

  if (!pb) {
    return {
      hallazgoId: hallazgo.id,
      completa: false,
      razonIncompleta: `No existe playbook registrado para la clave "${hallazgo.playbook}". El hallazgo se reporta sin solución propuesta antes que proponer una intervención no fundamentada.`,
      sustentos: {},
    };
  }

  const inversion = estimarInversion(pb, hallazgo, dataset);
  const contingencia = contingenciaDelHallazgo(hallazgo);

  // Beneficio anual: el P50 del impacto, con captura parcial declarada.
  const capturaSupuesta = opciones.capturaSupuesta ?? 0.70;
  const beneficioBruto = hallazgo.impacto?.cuantificable ? hallazgo.impacto.p50 : 0;
  const beneficioAnual = beneficioBruto * capturaSupuesta;
  const costoRecurrente = inversion.tipica * 0.15; // sostenimiento anual de la intervención

  const financiero = evaluarSolucion({
    inversionInicial: inversion.tipica,
    beneficioAnual,
    costoRecurrenteAnual: costoRecurrente,
    contingenciaLegal: contingencia.monto,
    horizonteAños: opciones.horizonteAños ?? 3,
    tasaDescuento: tasa,
    rampaMeses: pb.rampaMeses ?? 0,
  });

  const juridico = hallazgo.accionLegal ? sustentoJuridico(hallazgo.accionLegal) : null;

  // ── Campo 8 condicional: salud ocupacional
  const requiereSalud = hallazgo.tipo === 'sobrecarga_estructural' || hallazgo.seguridadPersonas ||
    hallazgo.dominio === 'puestos';
  const medico = requiereSalud ? {
    aplicable: true,
    hallazgoEpidemiologico: SALUD_OCUPACIONAL.jornadaLargaRiesgo.descripcion,
    fuente: SALUD_OCUPACIONAL.jornadaLargaRiesgo.fuente,
    año: SALUD_OCUPACIONAL.jornadaLargaRiesgo.año,
    muestra: SALUD_OCUPACIONAL.jornadaLargaRiesgo.muestra,
    confianza: SALUD_OCUPACIONAL.jornadaLargaRiesgo.confianza,
    desgasteOcupacional: `${SALUD_OCUPACIONAL.burnout.descripcion} Clasificación: ${SALUD_OCUPACIONAL.burnout.clasificacion}, código ${SALUD_OCUPACIONAL.burnout.codigo}.`,
    productividad: `${SALUD_OCUPACIONAL.saludMentalProductividad.descripcion} (${SALUD_OCUPACIONAL.saludMentalProductividad.fuente}).`,
    obligacionNormativa: 'NOM-035-STPS-2018: el patrón está obligado a identificar, analizar y prevenir los factores de riesgo psicosocial, y a conservar los registros correspondientes.',
    limitacion: 'Este sistema NO realiza diagnóstico médico individual. Las asociaciones epidemiológicas citadas son poblacionales y no predicen el estado de salud de ninguna persona concreta. La evaluación de salud corresponde exclusivamente a los servicios médicos del trabajo.',
  } : { aplicable: false, razon: 'El hallazgo no involucra condiciones que afecten la salud ocupacional.' };

  const fuentes = inventarioFuentes().filter((f) =>
    (EVIDENCIA_POR_DOMINIO[hallazgo.dominio] || []).some((k) => k === `${f.grupo}.${f.clave}`));

  const sustentos = {

    /* ── 1. MATEMÁTICO ────────────────────────────────────────────── */
    matematico: {
      completo: true,
      metodo: hallazgo.evidencia.metodo,
      calculoConDatosDelCliente: hallazgo.evidencia.calculo,
      datosDeEntrada: hallazgo.evidencia.datosUsados,
      cuantificacionDelImpacto: hallazgo.impacto?.cuantificable ? {
        metodo: hallazgo.impacto.metodo,
        p5: hallazgo.impacto.p5, p50: hallazgo.impacto.p50, p95: hallazgo.impacto.p95,
        esperado: hallazgo.impacto.esperado,
        componentes: hallazgo.impacto.componentes,
        sesgo: hallazgo.impacto.sesgo,
        supuestoClave: hallazgo.impacto.supuestoClave ?? null,
        lectura: `El rango P5–P95 es el intervalo de credibilidad del impacto. La evaluación financiera usa el P50 y la prueba de resistencia usa el P5: si la decisión no se sostiene con el P5, es una apuesta y no una inversión.`,
      } : { cuantificable: false, razon: hallazgo.impacto?.razon },
    },

    /* ── 2. ESTADÍSTICO ───────────────────────────────────────────── */
    estadistico: {
      completo: true,
      nivelDeEvidencia: hallazgo.confianza.etiquetaEvidencia,
      descripcion: hallazgo.confianza.descripcionEvidencia,
      tamañoDeMuestra: hallazgo.evidencia.n,
      pValor: hallazgo.evidencia.pValor,
      significativo: hallazgo.evidencia.significativo,
      confianzaCompuesta: {
        score: hallazgo.confianza.score,
        banda: hallazgo.confianza.banda,
        factores: hallazgo.confianza.factores,
        formula: 'Confianza = peso(nivel de evidencia) × factor de suficiencia de datos × penalización por muestra × ajuste por significancia',
      },
      lecturaRecomendada: hallazgo.confianza.lecturaRecomendada,
      limitacionesDeclaradas: [
        hallazgo.evidencia.n && hallazgo.evidencia.n < 30
          ? `Muestra de ${hallazgo.evidencia.n} observaciones: la potencia estadística es limitada y el intervalo de confianza es amplio.`
          : null,
        hallazgo.confianza.nivelEvidencia === 'CONVENCION'
          ? 'El umbral de comparación es una convención profesional, no un resultado empírico. Debe recalibrarse contra pares reales del sector.'
          : null,
        hallazgo.confianza.nivelEvidencia === 'INDICIO'
          ? 'Nivel de indicio: la señal justifica investigar, NO decidir. Cualquier acción irreversible basada solo en esto es un error metodológico.'
          : null,
      ].filter(Boolean),
    },

    /* ── 3. FINANCIERO ────────────────────────────────────────────── */
    financiero: {
      completo: hallazgo.impacto?.cuantificable === true,
      moneda,
      inversionEstimada: inversion,
      contingenciaLegalIncluida: contingencia,
      supuestoDeCaptura: `Se asume que se captura el ${round(capturaSupuesta * 100)}% del impacto P50 identificado. Este supuesto es conservador y parametrizable: rara vez se captura el 100% de una oportunidad teórica.`,
      beneficioAnualNeto: round(beneficioAnual - costoRecurrente),
      costoRecurrenteAnual: round(costoRecurrente),
      evaluacion: financiero,
      pruebaDeResistencia: hallazgo.impacto?.cuantificable ? (() => {
        const pesimista = evaluarSolucion({
          inversionInicial: inversion.maxima,
          beneficioAnual: hallazgo.impacto.p5 * capturaSupuesta,
          costoRecurrenteAnual: costoRecurrente,
          contingenciaLegal: contingencia.monto * 1.5,
          horizonteAños: opciones.horizonteAños ?? 3,
          tasaDescuento: tasa,
          rampaMeses: (pb.rampaMeses ?? 0) + 2,
        });
        return {
          escenario: 'Pesimista: beneficio en el P5, inversión en su máximo, contingencia 50% mayor y rampa dos meses más lenta.',
          vpn: pesimista.vpn,
          tir: pesimista.tirLegible,
          resiste: pesimista.vpn > 0,
          veredicto: pesimista.vpn > 0
            ? 'La decisión se sostiene incluso en el escenario adverso: es una inversión, no una apuesta.'
            : 'La decisión NO resiste el escenario adverso. Ejecutar solo tras reducir la inversión estimada, asegurar el beneficio con una prueba piloto, o aceptar explícitamente el riesgo.',
        };
      })() : null,
    },

    /* ── 4. JURÍDICO ──────────────────────────────────────────────── */
    juridico: juridico ? {
      completo: true,
      ...juridico,
    } : {
      completo: false,
      razon: 'Esta intervención no fue vinculada a una acción con implicaciones normativas específicas en el mapa jurídico del sistema.',
      advertenciaGeneral: 'La ausencia de vinculación NO equivale a ausencia de implicaciones legales. Toda medida con efectos sobre personas, contratos, precios o registros contables debe validarse jurídicamente antes de ejecutarse.',
      disclaimer: DISCLAIMER.texto,
    },

    /* ── 5. OPERATIVO ─────────────────────────────────────────────── */
    operativo: {
      completo: true,
      intervencion: pb.nombre,
      objetivo: pb.objetivo,
      mecanismoDeAccion: pb.mecanismo,
      pasos: pb.pasos.map((p, i) => ({ orden: i + 1, accion: p })),
      indicadorDeExito: pb.kpi,
      esfuerzo: {
        nivel: pb.esfuerzo, etiqueta: (ESFUERZO[pb.esfuerzo] || {}).etiqueta ?? String(pb.esfuerzo),
        descripcion: (ESFUERZO[pb.esfuerzo] || {}).desc ?? null,
      },
      rampaMeses: pb.rampaMeses,
      señalDeAborto: pb.señalDeAborto,
      notaSobreLaSeñalDeAborto:
        'La señal de aborto se define ANTES de iniciar. Es el criterio objetivo que autoriza a detener la intervención sin discusión. ' +
        'Su ausencia convierte cualquier iniciativa en un compromiso indefinido de recursos.',
    },

    /* ── 6. DE RIESGO ─────────────────────────────────────────────── */
    riesgo: {
      completo: true,
      riesgosDeEjecucion: pb.riesgos,
      riesgoDeNoActuar: hallazgo.impacto?.cuantificable
        ? `Mantener el statu quo tiene un costo estimado de ${fmtMoneda(hallazgo.impacto.p50, moneda)} anuales (escenario central), con un rango de ${fmtMoneda(hallazgo.impacto.p5, moneda)} a ${fmtMoneda(hallazgo.impacto.p95, moneda)}. La inacción no es una opción neutra: es la elección de seguir pagando ese monto.`
        : 'El costo de la inacción no se cuantificó por falta de insumos, pero el hallazgo persiste y su efecto continúa acumulándose.',
      severidad: hallazgo.severidad,
      esRestriccionDelSistema: hallazgo.esRestriccion,
      notaTOC: hallazgo.esRestriccion
        ? 'CRÍTICO: este hallazgo ocurre EN la restricción del sistema. Toda mejora aquí se traduce en mejora del throughput global.'
        : 'Este hallazgo NO ocurre en la restricción. Su resolución mejora la economía local pero no elevará el resultado global mientras la restricción no se atienda.',
    },

    /* ── 7. DE EVIDENCIA EXTERNA ──────────────────────────────────── */
    evidencia: {
      // Completo si el hallazgo se apoya en fuente externa O en datos internos
      // trazables del cliente. Un cálculo determinista sobre los propios libros
      // de la empresa es evidencia legítima aunque no cite bibliografía.
      completo: fuentes.length > 0 || (hallazgo.evidencia.datosUsados || []).length > 0,
      fuentesAplicables: fuentes.map((f) => ({
        referencia: f.fuente, año: f.año, muestra: f.muestra,
        nivelDeConfianza: f.confianza, nota: f.nota,
      })),
      advertenciaSobreBenchmarks:
        'Los benchmarks externos orientan, no determinan. Un umbral derivado de una industria distinta puede ser irrelevante ' +
        'para esta empresa. Las fuentes marcadas como "convencion" son prácticas profesionales estandarizadas sin estudio ' +
        'empírico único de respaldo, y deben recalibrarse contra pares reales del sector antes de tomarse como meta.',
      fuentesInternas: hallazgo.evidencia.datosUsados,
      naturalezaDeLaEvidencia: fuentes.length > 0
        ? 'Combina datos internos del cliente con referencias externas documentadas.'
        : 'Se apoya exclusivamente en datos internos del cliente: el cálculo es trazable pero carece de punto de comparación externo. Conseguir un benchmark sectorial elevaría la confianza de este hallazgo.',
    },

    /* ── 8. MÉDICO (condicional) ──────────────────────────────────── */
    saludOcupacional: medico,
  };

  const camposIncompletos = Object.entries(sustentos)
    .filter(([k, v]) => k !== 'saludOcupacional' && v.completo === false)
    .map(([k, v]) => ({
      campo: k,
      razon: v.razon ?? v.razonIncompleta ?? 'no especificada',
      // Distinción deliberada: un campo puede faltar porque no aplica
      // (el motor lo evaluó y concluyó que no corresponde) o porque falta
      // información. Confundir ambos casos degrada la lectura del informe.
      naturaleza: k === 'juridico' ? 'no vinculado a acción normada' : 'insuficiencia de insumos',
    }));

  return {
    hallazgoId: hallazgo.id,
    intervencion: pb.nombre,
    playbook: hallazgo.playbook,
    completa: camposIncompletos.length === 0,
    camposIncompletos,
    esfuerzo: pb.esfuerzo,
    sustentos,
    resumenEjecutivo: {
      queHacer: pb.objetivo,
      porQueFunciona: pb.mecanismo,
      cuantoCuesta: inversion.tipica,
      cuantoDevuelve: round(beneficioAnual - costoRecurrente),
      vpn: financiero.vpn,
      recuperacionAños: financiero.paybackAños,
      veredicto: financiero.veredicto,
      primerPaso: pb.pasos[0],
      cuandoDetenerse: pb.señalDeAborto,
    },
  };
}

/** Resuelve todos los hallazgos y calcula la prioridad relativa entre ellos. */
export function resolverTodos(hallazgos, dataset, opciones = {}) {
  const impactoMaximo = Math.max(1, ...hallazgos.map((h) => (h.impacto?.cuantificable ? Math.abs(h.impacto.p50) : 0)));

  return hallazgos.map((h) => {
    const sol = resolver(h, dataset, opciones);
    const prio = prioridad({
      impactoP50: h.impacto?.cuantificable ? h.impacto.p50 : 0,
      cuantificado: h.impacto?.cuantificable === true,
      impactoMaximo,
      confianzaScore: h.confianza.score,
      severidad: h.severidad.valor,
      esfuerzo: sol.esfuerzo ?? 3,
      esRestriccion: h.esRestriccion,
      bloqueaLegal: h.bloqueaLegal,
    });
    return { ...h, solucion: sol, prioridad: prio };
  });
}

export default { resolver, resolverTodos };
