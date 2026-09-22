/**
 * INTELIS · Contrato común de los detectores
 * ─────────────────────────────────────────────────────────────────────────────
 * Todo detector devuelve { dominio, evaluado, razonNoEvaluado, hallazgos[] }.
 * Todo hallazgo es un objeto con la MISMA anatomía, porque un informe en el que
 * cada sección argumenta distinto no se puede auditar ni comparar.
 */

import { round, isNum } from '../core/stats.js';
import { cuantificar, confianza, severidadPorImpacto } from '../core/scoring.js';

let _seq = 0;
export const resetSeq = () => { _seq = 0; };

/**
 * Semilla activa de la corrida. El orquestador la fija antes de ejecutar los
 * detectores, de modo que toda simulación Monte Carlo del informe comparta la
 * misma fuente de aleatoriedad reproducible. Sin esto, el campo `semilla` del
 * informe sería una declaración sin efecto — el motor afirmaría una
 * reproducibilidad parametrizable que en realidad no tendría.
 */
let _seed = 20260921;
export const setSeed = (s) => { _seed = Number.isFinite(s) ? (s >>> 0) : 20260921; };
export const getSeed = () => _seed;

/**
 * Fábrica de hallazgos. Obliga a declarar el método y el cálculo: un hallazgo
 * sin `evidencia.calculo` no puede construirse, por diseño.
 */
export function hallazgo(spec) {
  const {
    dominio, tipo, titulo, descripcion,
    metodo, calculo, datosUsados = [], pValor = null, n = null,
    componentesImpacto = [], impactoDirecto = null,
    nivelEvidencia = 'DETERMINISTA', factorISD = 1,
    ingresosAnuales = null, esRestriccion = false, bloqueaLegal = false,
    seguridadPersonas = false, legalPenal = false,
    accionLegal = null, playbook = null, esfuerzo = 3,
    contexto = {}, seed,
  } = spec;

  // Cada hallazgo deriva su propia semilla de la semilla de la corrida más su
  // número de secuencia. Así dos hallazgos distintos no comparten exactamente
  // el mismo flujo de números aleatorios, y la corrida completa sigue siendo
  // reproducible a partir de un único valor.
  const semillaHallazgo = Number.isFinite(seed) ? seed : (_seed + (_seq + 1) * 7919) >>> 0;

  if (!metodo || !calculo) {
    throw new Error(`Hallazgo "${titulo}" sin método o cálculo declarado: violación del contrato de auditabilidad.`);
  }

  const impacto = componentesImpacto.length
    ? cuantificar(componentesImpacto, semillaHallazgo)
    : isNum(impactoDirecto)
      ? {
          cuantificable: true,
          metodo: 'Cálculo determinista sobre datos del cliente (sin rango: la magnitud se deriva de una identidad, no de una estimación)',
          p5: round(impactoDirecto), p25: round(impactoDirecto), p50: round(impactoDirecto),
          p75: round(impactoDirecto), p95: round(impactoDirecto),
          esperado: round(impactoDirecto), desviacion: 0, componentes: [],
          sesgo: 'determinista',
        }
      : { cuantificable: false, razon: 'Hallazgo cualitativo: su efecto es real pero no se cifró por falta de insumos para estimarlo con honestidad.' };

  const p50 = impacto.cuantificable ? impacto.p50 : 0;
  const sev = severidadPorImpacto(p50, ingresosAnuales, { legalPenal, seguridadPersonas });
  const conf = confianza(nivelEvidencia, factorISD, n, pValor);

  return {
    id: `H-${String(++_seq).padStart(3, '0')}`,
    dominio, tipo, titulo, descripcion,
    evidencia: {
      metodo, calculo,
      datosUsados,
      n, pValor: isNum(pValor) ? round(pValor, 5) : null,
      significativo: isNum(pValor) ? pValor < 0.05 : null,
    },
    impacto,
    severidad: { valor: sev, etiqueta: etiquetaSeveridad(sev) },
    confianza: conf,
    esRestriccion, bloqueaLegal,
    accionLegal, playbook, esfuerzo,
    contexto,
  };
}

export function etiquetaSeveridad(v) {
  if (v >= 10) return 'Catastrófica';
  if (v >= 9) return 'Muy alta';
  if (v >= 7) return 'Alta';
  if (v >= 5) return 'Moderada';
  if (v >= 3) return 'Baja';
  return 'Mínima';
}

/** Respuesta estándar cuando un dominio no es evaluable. */
export function noEvaluable(dominio, razon, insumosFaltantes = []) {
  return {
    dominio, evaluado: false, hallazgos: [],
    razonNoEvaluado: razon,
    insumosFaltantes,
    advertencia:
      'AUSENCIA DE DATOS, NO AUSENCIA DE PROBLEMAS. Este dominio no se analizó por falta de insumos. ' +
      'No debe interpretarse como que la organización está sana en esta dimensión.',
  };
}

export const fmt = (x, m = 'MXN') =>
  isNum(x) ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: m, maximumFractionDigits: 0 }).format(x) : 's/d';
export const pct = (x, d = 1) => (isNum(x) ? `${round(x * 100, d)}%` : 's/d');
