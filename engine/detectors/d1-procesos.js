/**
 * DETECTOR 1 · ERRORES, FALLOS Y DEFECTOS DE PROCESO
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿dónde el proceso produce resultados que no debería,
 * y esa variación es señal (causa asignable) o ruido (causa común)?
 *
 * Esta distinción, debida a Shewhart y Deming, es la más costosa de ignorar:
 * reaccionar a ruido como si fuera señal ("manipulación" o tampering) AUMENTA
 * la variación del proceso. El detector separa ambos casos antes de proponer.
 *
 * Métodos: carta de individuos I-MR con reglas Western Electric · índice de
 * capacidad Cpk · nivel sigma desde DPMO · prueba de tendencia de Mann-Kendall.
 */

import { individualsChart, capability, sigmaLevel, mannKendall, clean, mean, stdev, cv, round, isNum } from '../core/stats.js';
import { CALIDAD } from '../data/benchmarks.js';
import { periodicidadDe } from '../core/schema.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

export function detectarProcesos(d, isd) {
  const dom = 'procesos';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const procesos = d.procesos || [];
  const per = periodicidadDe(d, 'procesos', 'mensual');
  const ingresos = d.finanzas?.ingresos;
  const moneda = d.empresa?.moneda || 'MXN';
  const H = [];

  procesos.forEach((p) => {
    const nombre = p.nombre || p.id;

    /* ── 1.1 Estabilidad estadística (causas asignables) ───────────────── */
    const serie = clean(p.tiempoCiclo);
    if (serie.length >= 10) {
      const cc = individualsChart(serie);
      if (cc.applicable && !cc.inControl) {
        const reglas = [...new Set(cc.violations.map((v) => v.rule))].sort();
        const desc = cc.violations.slice(0, 3).map((v) => `punto ${v.i + 1} (${round(v.value, 2)}, z=${round(v.z, 2)}): ${v.desc}`);
        // Impacto: el exceso de tiempo de los puntos fuera de control, valorado
        // al costo de retrabajo si existe; si no, se deja cualitativo.
        const exceso = cc.violations
          .filter((v) => v.value > cc.cl)
          .reduce((s, v) => s + (v.value - cc.cl), 0);
        const ciclosPorAño = isNum(p.tasaLlegada) ? p.tasaLlegada * per.factor : null;
        const costoUnit = isNum(p.costoRetrabajo) ? p.costoRetrabajo : null;
        const comps = (costoUnit && ciclosPorAño && serie.length)
          ? [{
              concepto: `Sobrecosto por inestabilidad en ${nombre}`,
              min:  (exceso / serie.length) * ciclosPorAño * costoUnit * 0.4,
              mode: (exceso / serie.length) * ciclosPorAño * costoUnit,
              max:  (exceso / serie.length) * ciclosPorAño * costoUnit * 1.8,
            }]
          : [];

        H.push(hallazgo({
          dominio: dom, tipo: 'proceso_fuera_de_control',
          titulo: `Proceso "${nombre}" fuera de control estadístico`,
          descripcion:
            `La carta de individuos detecta ${cc.violations.length} señal(es) de causa asignable en ${cc.n} observaciones ` +
            `(${pct(cc.outOfControlRate)} de los puntos). Esto significa que la variación NO es aleatoria: existen factores ` +
            `identificables y removibles. Reglas violadas: ${reglas.join(', ')} de Western Electric.`,
          metodo: 'Carta de control de individuos (I-MR) con reglas Western Electric 1–4',
          calculo:
            `σ̂ = MR̄/d₂ = ${round(cc.mrBar, 3)}/1.128 = ${round(cc.sigma, 3)} · ` +
            `LC = ${round(cc.cl, 3)} · LCS = LC + 3σ̂ = ${round(cc.ucl, 3)} · LCI = LC − 3σ̂ = ${round(cc.lcl, 3)}. ` +
            `Se estima σ por rango móvil y no por desviación global porque, si el proceso es inestable, ` +
            `la s global absorbe la señal y enmascara el problema. Señales: ${desc.join(' | ')}.`,
          datosUsados: [`procesos["${nombre}"].tiempoCiclo (n=${cc.n})`],
          n: cc.n,
          nivelEvidencia: 'ESTADISTICA',
          factorISD: info.factorConfianza,
          componentesImpacto: comps,
          ingresosAnuales: ingresos,
          esfuerzo: 2,
          playbook: 'estabilizar_proceso',
          accionLegal: 'automatizar_proceso',
          contexto: {
            etapa: nombre,
            limiteControlSuperior: round(cc.ucl, 3), limiteControlInferior: round(cc.lcl, 3),
            lineaCentral: round(cc.cl, 3), sigmaEstimada: round(cc.sigma, 3),
            violaciones: cc.violations.map((v) => ({ punto: v.i + 1, valor: round(v.value, 3), z: round(v.z, 2), regla: v.rule, descripcion: v.desc })),
            interpretacionDeming:
              'Causa asignable presente. Corresponde investigar el evento específico de cada punto señalado. ' +
              'Ajustar el proceso "en promedio" ante causas comunes (tampering) incrementaría la variación.',
          },
        }));
      } else if (cc.applicable && cc.inControl) {
        // Estable pero incapaz: el caso que más se malinterpreta.
        const cap = capability(serie, p.lslTiempo, p.uslTiempo);
        if (cap.applicable && cap.cpk < CALIDAD.capacidadMinima.cpkMinimo) {
          const ciclosPorAño = isNum(p.tasaLlegada) ? p.tasaLlegada * per.factor : null;
          const costoUnit = isNum(p.costoRetrabajo) ? p.costoRetrabajo : null;
          // Solo la cola SUPERIOR genera costo en una característica de tiempo de
          // ciclo: terminar antes del límite inferior no cuesta, mejora. Sumar ambas
          // colas sobrestima el impacto económico de forma sistemática.
          const ppmCostoso = isNum(p.uslTiempo) ? cap.ppmSobreLimiteSuperior : cap.ppmDefective;
          const fueraEspecAnual = ciclosPorAño ? (ppmCostoso / 1e6) * ciclosPorAño : null;
          const comps = (fueraEspecAnual && costoUnit)
            ? [{ concepto: `Unidades fuera de especificación en ${nombre}`,
                 min: fueraEspecAnual * costoUnit * 0.6,
                 mode: fueraEspecAnual * costoUnit,
                 max: fueraEspecAnual * costoUnit * 1.5 }]
            : [];
          H.push(hallazgo({
            dominio: dom, tipo: 'proceso_estable_incapaz',
            titulo: `Proceso "${nombre}" estable pero INCAPAZ de cumplir la especificación`,
            descripcion:
              `El proceso está en control estadístico (sin causas asignables), pero su capacidad Cpk = ${round(cap.cpk, 3)} ` +
              `está por debajo del mínimo industrial de ${CALIDAD.capacidadMinima.cpkMinimo}. Diagnóstico: el problema NO son ` +
              `incidentes aislados ni personas; es el DISEÑO del proceso. Se estima ${round(cap.ppmDefective)} partes por millón ` +
              `fuera de especificación, de las cuales ${round(ppmCostoso)} ppm exceden el límite SUPERIOR — la única cola ` +
              `con consecuencia económica en una característica de tiempo de ciclo` +
              `${fueraEspecAnual ? `: equivalen a ${round(fueraEspecAnual)} unidades al año` : ''}. ` +
              `Presionar al equipo por mejores resultados sin rediseñar el proceso no puede funcionar: la capacidad es una ` +
              `propiedad del sistema, no del esfuerzo.`,
            metodo: 'Índice de capacidad de proceso Cp/Cpk sobre proceso previamente validado como estable',
            calculo:
              `x̄ = ${round(cap.mean, 3)} · σ = ${round(cap.sigma, 3)} · ` +
              `Cpk = mín[(LSE−x̄)/3σ, (x̄−LSI)/3σ] = mín[${round(cap.cpu, 3)}, ${round(cap.cpl, 3)}] = ${round(cap.cpk, 3)}. ` +
              `Fracción fuera de especificación bajo normalidad = ${round(cap.ppmDefective)} ppm en total, de los cuales ` +
              `${round(cap.ppmSobreLimiteSuperior)} ppm exceden el LSE y ${round(cap.ppmBajoLimiteInferior)} ppm quedan bajo el LSI. ` +
              `Solo la cola superior se valoriza. Veredicto de capacidad: ${cap.veredicto}.`,
            datosUsados: [`procesos["${nombre}"].tiempoCiclo`, 'límites de especificación LSI/LSE'],
            n: serie.length,
            nivelEvidencia: 'MODELO',
            factorISD: info.factorConfianza,
            componentesImpacto: comps,
            ingresosAnuales: ingresos,
            esfuerzo: 5,
            playbook: 'rediseñar_proceso',
            accionLegal: 'automatizar_proceso',
            contexto: { etapa: nombre, cp: round(cap.cp, 3), cpk: round(cap.cpk, 3), ppmTotal: round(cap.ppmDefective), ppmSobreLSE: round(cap.ppmSobreLimiteSuperior), ppmBajoLSI: round(cap.ppmBajoLimiteInferior), unidadesFueraEspecAnuales: fueraEspecAnual ? round(fueraEspecAnual) : null, veredicto: cap.veredicto },
          }));
        }
      }
    }

    /* ── 1.2 Nivel de calidad (DPMO → sigma) ──────────────────────────── */
    if (isNum(p.defectos) && isNum(p.unidades) && p.unidades > 0) {
      const sl = sigmaLevel(p.defectos, p.unidades, p.oportunidades || 1);
      if (sl.applicable && sl.sigma < 4) {
        const costoUnit = isNum(p.costoRetrabajo) ? p.costoRetrabajo : null;
        const defectosAnuales = p.defectos * per.factor;
        // Escenario de mejora: llevar el proceso al nivel 4σ (6,210 DPMO).
        const defectosA4Sigma = (6210 / 1e6) * (p.unidades * per.factor) * (p.oportunidades || 1);
        const evitables = Math.max(0, defectosAnuales - defectosA4Sigma);
        const comps = costoUnit
          ? [{ concepto: `Defectos evitables en ${nombre} al alcanzar nivel 4σ`,
               min: evitables * costoUnit * 0.5,
               mode: evitables * costoUnit,
               max: evitables * costoUnit * 1.6 }]
          : [];
        H.push(hallazgo({
          dominio: dom, tipo: 'nivel_calidad_deficiente',
          titulo: `Nivel de calidad de "${nombre}": ${round(sl.sigma, 2)}σ (${sl.clase})`,
          descripcion:
            `Con ${p.defectos} defectos sobre ${p.unidades} unidades y ${p.oportunidades || 1} oportunidad(es) por unidad, ` +
            `el proceso opera a ${round(sl.dpmo)} DPMO, equivalente a ${round(sl.sigma, 2)} sigma y un rendimiento de ${pct(sl.yield, 3)}. ` +
            `Llevarlo a 4σ (6,210 DPMO, el mínimo aceptable en práctica industrial) evitaría aproximadamente ${round(evitables)} defectos al año.`,
          metodo: 'Conversión DPMO → nivel sigma con corrimiento convencional de 1.5σ a largo plazo',
          calculo:
            `DPMO = (${p.defectos} / (${p.unidades} × ${p.oportunidades || 1})) × 10⁶ = ${round(sl.dpmo)}. ` +
            `Rendimiento = 1 − DPMO/10⁶ = ${round(sl.yield, 6)}. ` +
            `Nivel σ = Φ⁻¹(rendimiento) + 1.5 = ${round(sl.sigma, 3)}. ` +
            `Referencia: 3σ ≈ 66,807 DPMO; 4σ ≈ 6,210; 5σ ≈ 233; 6σ ≈ 3.4 (${CALIDAD.nivelesSigma.fuente}).`,
          datosUsados: [`procesos["${nombre}"].defectos`, `procesos["${nombre}"].unidades`],
          n: p.unidades,
          nivelEvidencia: 'MODELO',
          factorISD: info.factorConfianza,
          componentesImpacto: comps,
          ingresosAnuales: ingresos,
          esfuerzo: 3,
          playbook: 'reducir_defectos',
          accionLegal: 'automatizar_proceso',
          contexto: { etapa: nombre, dpmo: round(sl.dpmo), sigma: round(sl.sigma, 2), rendimiento: round(sl.yield, 5), clase: sl.clase },
        }));
      }
    }

    /* ── 1.3 Deriva: el proceso empeora de forma sostenida ────────────── */
    if (serie.length >= 8) {
      const mk = mannKendall(serie);
      if (mk.applicable && mk.significant && mk.senSlope > 0) {
        const proyeccion12 = mean(serie) + mk.senSlope * 12;
        H.push(hallazgo({
          dominio: dom, tipo: 'deriva_proceso',
          titulo: `Deterioro sostenido en "${nombre}": tendencia creciente significativa`,
          descripcion:
            `La prueba no paramétrica de Mann-Kendall detecta una tendencia monótona creciente estadísticamente significativa ` +
            `(p = ${round(mk.p, 4)}) en el tiempo de ciclo. La pendiente de Theil-Sen es de ${round(mk.senSlope, 4)} unidades por periodo. ` +
            `De mantenerse, en 12 periodos el valor esperado sería ${round(proyeccion12, 2)} frente a la media actual de ${round(mean(serie), 2)}. ` +
            `Una deriva no es un mal mes: es un mecanismo que se está degradando y que seguirá degradándose sin intervención.`,
          metodo: 'Prueba de tendencia monótona de Mann-Kendall con estimador de pendiente de Theil-Sen (no paramétrica, robusta a no-normalidad y a atípicos)',
          calculo:
            `S = ${mk.S} · Var(S) = n(n−1)(2n+5)/18 · Z = ${round(mk.Z, 3)} · p = ${round(mk.p, 5)} (bilateral). ` +
            `Pendiente de Theil-Sen = mediana de todas las pendientes por pares = ${round(mk.senSlope, 5)} por periodo. ` +
            `Se usa Theil-Sen en lugar de MCO porque su punto de ruptura del 29% la hace insensible a valores extremos aislados.`,
          datosUsados: [`procesos["${nombre}"].tiempoCiclo (serie temporal, n=${mk.n})`],
          n: mk.n, pValor: mk.p,
          nivelEvidencia: 'ESTADISTICA',
          factorISD: info.factorConfianza,
          ingresosAnuales: ingresos,
          esfuerzo: 3,
          playbook: 'contener_deriva',
          contexto: { etapa: nombre, pendientePorPeriodo: round(mk.senSlope, 5), proyeccion12Periodos: round(proyeccion12, 2), Z: round(mk.Z, 3) },
        }));
      }
    }

    /* ── 1.4 Variabilidad excesiva (predecibilidad del compromiso) ─────── */
    if (serie.length >= 10) {
      const c = cv(serie);
      if (isNum(c) && c > 0.30) {
        H.push(hallazgo({
          dominio: dom, tipo: 'variabilidad_excesiva',
          titulo: `Variabilidad no gestionable en "${nombre}": CV = ${pct(c)}`,
          descripcion:
            `El coeficiente de variación de ${pct(c)} implica que el tiempo de esta etapa no es predecible. ` +
            `Consecuencia directa y cuantificable: cualquier promesa de entrega basada en el promedio se incumplirá cerca de la mitad de las veces. ` +
            `Para prometer con 95% de confiabilidad habría que comprometer ${round(mean(serie) + 1.645 * stdev(serie), 2)} en lugar de ${round(mean(serie), 2)}, ` +
            `un colchón de ${pct(1.645 * c)} sobre el promedio. La variabilidad se paga con inventario, con tiempo o con incumplimiento: siempre se paga.`,
          metodo: 'Coeficiente de variación y cuantil de servicio bajo aproximación normal',
          calculo:
            `CV = σ/μ = ${round(stdev(serie), 3)}/${round(mean(serie), 3)} = ${round(c, 3)}. ` +
            `Compromiso al 95% = μ + 1.645σ = ${round(mean(serie) + 1.645 * stdev(serie), 3)}. ` +
            `Umbral de referencia: CV > 0.30 se considera proceso de alta variabilidad en gestión de operaciones.`,
          datosUsados: [`procesos["${nombre}"].tiempoCiclo`],
          n: serie.length,
          nivelEvidencia: 'DETERMINISTA',
          factorISD: info.factorConfianza,
          ingresosAnuales: ingresos,
          esfuerzo: 3,
          playbook: 'reducir_variabilidad',
          contexto: { etapa: nombre, cv: round(c, 3), media: round(mean(serie), 3), sigma: round(stdev(serie), 3), compromiso95: round(mean(serie) + 1.645 * stdev(serie), 3) },
        }));
      }
    }
  });

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    cobertura: {
      etapasAnalizadas: procesos.length,
      conSerieTemporal: procesos.filter((p) => clean(p.tiempoCiclo).length >= 10).length,
      conConteoDefectos: procesos.filter((p) => isNum(p.defectos) && isNum(p.unidades)).length,
      periodicidad: per,
      isd: info.isd,
    },
    marcoConceptual:
      'Shewhart–Deming: toda variación es común (inherente al sistema) o asignable (identificable y removible). ' +
      'Tratar una como la otra empeora el resultado. Este detector clasifica antes de recomendar.',
  };
}
