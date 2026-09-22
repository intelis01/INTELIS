/**
 * DETECTOR 5 · ESTRUCTURAS ORGANIZACIONALES FALLIDAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿la forma del organigrama ayuda o estorba al trabajo?
 *
 * Una estructura falla de formas medibles: capas que solo retransmiten, tramos
 * de control fuera del rango gestionable, costo de coordinación que crece
 * cuadráticamente, y puntos únicos de falla que concentran riesgo operativo.
 *
 * Métodos: análisis de grafo de reporte · tramo de control · profundidad teórica
 * log_s(N) vs. observada · ley cuadrática de enlaces de Brooks · detección de
 * capas parasitarias · identificación de SPOF.
 */

import { mean, median, round, isNum, sum, gini } from '../core/stats.js';
import { ESTRUCTURA, COSTO_DISFUNCION } from '../data/benchmarks.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

export function detectarEstructura(d, isd) {
  const dom = 'estructura';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const personal = d.personal || [];
  const ingresos = d.finanzas?.ingresos;
  const moneda = d.empresa?.moneda || 'MXN';
  const H = [];

  // Grafo de reporte
  const hijos = new Map();
  personal.forEach((p) => { if (p.reportaA) { if (!hijos.has(p.reportaA)) hijos.set(p.reportaA, []); hijos.get(p.reportaA).push(p); } });
  const byId = new Map(personal.map((p) => [p.id, p]));
  const raices = personal.filter((p) => !p.reportaA);

  // Profundidad de cada nodo
  const profundidad = new Map();
  const calcProf = (p, dep = 1, visto = new Set()) => {
    if (visto.has(p.id)) return;
    visto.add(p.id);
    profundidad.set(p.id, dep);
    (hijos.get(p.id) || []).forEach((c) => calcProf(c, dep + 1, visto));
  };
  raices.forEach((r) => calcProf(r));
  const capasObservadas = Math.max(1, ...[...profundidad.values()]);

  const gerentes = personal.filter((p) => (hijos.get(p.id) || []).length > 0);
  const tramos = gerentes.map((p) => ({ p, n: (hijos.get(p.id) || []).length }));

  /* ═══ 5.1 CAPAS PARASITARIAS (tramo de control ≤ 2) ═════════════════ */
  const parasitarias = tramos.filter((t) => t.n <= 2 && profundidad.get(t.p.id) > 1);
  parasitarias.forEach((t) => {
    const p = t.p;
    const costo = p.costoAnual || 0;
    H.push(hallazgo({
      dominio: dom, tipo: 'capa_parasitaria',
      titulo: `Capa de baja densidad: "${p.puesto}" supervisa únicamente ${t.n} reporte(s) directo(s)`,
      descripcion:
        `Este nivel jerárquico (capa ${profundidad.get(p.id)} de ${capasObservadas}) gestiona ${t.n} persona(s). ` +
        `El rango de referencia para trabajo de conocimiento es de ${ESTRUCTURA.tramoControl.conocimiento[0]} a ${ESTRUCTURA.tramoControl.conocimiento[1]} reportes directos. ` +
        `Una capa con dos o menos reportes rara vez agrega decisión: agrega un salto de retransmisión. ` +
        `El costo no es el sueldo: es la LATENCIA. Cada capa adicional entre quien detecta un problema y quien puede ` +
        `autorizar su solución añade un ciclo de espera y una oportunidad de distorsión del mensaje. ` +
        `MATIZ NECESARIO: un tramo estrecho es legítimo cuando el rol tiene contenido técnico propio (no solo supervisa), ` +
        `cuando forma a un sucesor o cuando el trabajo supervisado es de altísima interdependencia. Verificar antes de concluir.`,
      metodo: 'Análisis del grafo de reporte: tramo de control por nodo contra el rango de referencia de diseño organizacional',
      calculo:
        `Tramo de control de "${p.puesto}" = ${t.n}. Profundidad = capa ${profundidad.get(p.id)} de ${capasObservadas}. ` +
        `Tramo promedio de la organización = ${round(mean(tramos.map((x) => x.n)), 2)} (mediana ${round(median(tramos.map((x) => x.n)), 1)}). ` +
        `Rango de referencia: ${ESTRUCTURA.tramoControl.conocimiento.join('–')} para trabajo de conocimiento (${ESTRUCTURA.tramoControl.fuente}).`,
      datosUsados: [`personal["${p.puesto}"]`, 'grafo de reportaA'],
      n: gerentes.length,
      nivelEvidencia: 'BENCHMARK',
      factorISD: info.factorConfianza,
      componentesImpacto: costo > 0 ? [{
        concepto: `Costo de coordinación atribuible a la capa "${p.puesto}"`,
        min: costo * 0.15, mode: costo * 0.40, max: costo * 0.75,
      }] : [],
      ingresosAnuales: ingresos,
      esfuerzo: 5,
      playbook: 'aplanar_capa',
      accionLegal: 'rediseñar_estructura',
      contexto: {
        puesto: p.puesto, area: p.area, capa: profundidad.get(p.id), tramoControl: t.n,
        reportesDirectos: (hijos.get(p.id) || []).map((c) => c.puesto),
        rangoReferencia: ESTRUCTURA.tramoControl.conocimiento,
        alternativaPreferente: 'Ampliar el tramo del nivel superior absorbiendo estos reportes, reubicando a la persona en un rol de contribución individual de alto valor. El aplanamiento no exige necesariamente una separación.',
      },
    }));
  });

  /* ═══ 5.2 TRAMO EXCESIVO ════════════════════════════════════════════ */
  tramos.filter((t) => t.n > ESTRUCTURA.tramoControl.estandarizado[1]).forEach((t) => {
    H.push(hallazgo({
      dominio: dom, tipo: 'tramo_excesivo',
      titulo: `Tramo de control insostenible: "${t.p.puesto}" con ${t.n} reportes directos`,
      descripcion:
        `Con ${t.n} reportes directos, el tiempo disponible por persona colapsa: en una semana de 40 horas dedicando ` +
        `un 30% a gestión de equipo, corresponden ${round((40 * 0.3 * 60) / t.n)} minutos semanales por colaborador. ` +
        `Consecuencias medibles: retroalimentación inexistente, decisiones que se toman sin consultar por no poder acceder al jefe, ` +
        `y detección tardía de problemas. Los canales de comunicación en el equipo son ${round((t.n * (t.n - 1)) / 2)} ` +
        `(ley cuadrática de Brooks), frente a los ${round((9 * 8) / 2)} de un equipo de nueve.`,
      metodo: 'Tramo de control contra rango de referencia + ley cuadrática de enlaces de comunicación',
      calculo:
        `Tramo = ${t.n}. Enlaces de comunicación = n(n−1)/2 = ${t.n}×${t.n - 1}/2 = ${round((t.n * (t.n - 1)) / 2)} (${ESTRUCTURA.costoCoordinacion.fuente}). ` +
        `Tiempo de gestión por reporte = (40 h × 30%)/${t.n} = ${round((40 * 0.3) / t.n, 2)} h/semana. ` +
        `Rango de referencia superior para trabajo estandarizado: ${ESTRUCTURA.tramoControl.estandarizado[1]}.`,
      datosUsados: [`personal["${t.p.puesto}"]`, 'grafo de reportaA'],
      n: gerentes.length,
      nivelEvidencia: 'BENCHMARK',
      factorISD: info.factorConfianza,
      ingresosAnuales: ingresos,
      esfuerzo: 3,
      playbook: 'dividir_tramo',
      accionLegal: 'rediseñar_estructura',
      contexto: { puesto: t.p.puesto, tramoControl: t.n, enlacesComunicacion: round((t.n * (t.n - 1)) / 2), minutosSemanalesPorReporte: round((40 * 0.3 * 60) / t.n) },
    }));
  });

  /* ═══ 5.3 PROFUNDIDAD JERÁRQUICA EXCESIVA ═══════════════════════════ */
  if (tramos.length >= 2 && personal.length >= 8) {
    const tramoPromedio = mean(tramos.map((t) => t.n));
    const capasTeoricas = tramoPromedio > 1 ? Math.ceil(Math.log(personal.length) / Math.log(tramoPromedio)) : capasObservadas;
    if (capasObservadas > capasTeoricas + 1) {
      const exceso = capasObservadas - capasTeoricas;
      const costoGerencial = sum(gerentes.map((g) => g.costoAnual || 0));
      const lastre = sum(personal.map((p) => p.costoAnual || 0)) * COSTO_DISFUNCION.lastreOrganizacional.valor * (exceso / Math.max(1, capasObservadas));
      H.push(hallazgo({
        dominio: dom, tipo: 'jerarquia_inflada',
        titulo: `Jerarquía inflada: ${capasObservadas} capas donde ${capasTeoricas} bastarían`,
        descripcion:
          `Con ${personal.length} personas y un tramo de control promedio de ${round(tramoPromedio, 1)}, un árbol de reporte ` +
          `eficiente requeriría ${capasTeoricas} capas. Se observan ${capasObservadas}: ${exceso} capa(s) de exceso. ` +
          `Cada capa excedente añade una ronda de aprobación, una traducción del mensaje y una demora al ciclo de decisión. ` +
          `La investigación de Bain sobre "lastre organizacional" estima que las organizaciones pierden más del ` +
          `${pct(COSTO_DISFUNCION.lastreOrganizacional.valor)} de su capacidad productiva en coordinación interna, juntas y aprobaciones.`,
        metodo: 'Comparación de capas observadas contra la profundidad teórica del árbol de reporte log_s(N)',
        calculo:
          `N = ${personal.length} personas · tramo promedio s = ${round(tramoPromedio, 3)}. ` +
          `Capas teóricas = ⌈log_s(N)⌉ = ⌈ln(${personal.length})/ln(${round(tramoPromedio, 2)})⌉ = ${capasTeoricas}. ` +
          `Capas observadas = ${capasObservadas}. Exceso = ${exceso}. ` +
          `Costo gerencial total = ${round(costoGerencial, 2)}. ` +
          `Lastre estimado = costo laboral total × ${COSTO_DISFUNCION.lastreOrganizacional.valor} × (exceso/capas) = ${round(lastre, 2)}.`,
        datosUsados: ['grafo completo de reportaA', 'personal[].costoAnual'],
        n: personal.length,
        nivelEvidencia: 'BENCHMARK',
        factorISD: info.factorConfianza,
        componentesImpacto: [{
          concepto: 'Capacidad productiva recuperable al reducir capas de coordinación',
          min: lastre * 0.2, mode: lastre * 0.45, max: lastre * 0.8,
        }],
        ingresosAnuales: ingresos,
        esfuerzo: 8,
        playbook: 'aplanar_organizacion',
        accionLegal: 'rediseñar_estructura',
        contexto: {
          capasObservadas, capasTeoricas, exceso,
          tramoPromedio: round(tramoPromedio, 2),
          distribucionTramos: tramos.map((t) => ({ puesto: t.p.puesto, capa: profundidad.get(t.p.id), tramo: t.n })).sort((a, b) => a.capa - b.capa),
          desigualdadDeTramos: round(gini(tramos.map((t) => t.n)), 3),
          fuenteLastre: COSTO_DISFUNCION.lastreOrganizacional.fuente,
        },
      }));
    }
  }

  /* ═══ 5.4 PUNTOS ÚNICOS DE FALLA ════════════════════════════════════ */
  const spof = personal.filter((p) => p.critico === true || ((hijos.get(p.id) || []).length >= 4 && (p.responsabilidades || []).length >= 4));
  if (spof.length) {
    const ingresoExpuesto = ingresos ? ingresos * Math.min(0.35, 0.08 * spof.length) : null;
    H.push(hallazgo({
      dominio: dom, tipo: 'punto_unico_falla',
      titulo: `${spof.length} punto(s) único(s) de falla en la estructura`,
      descripcion:
        `Las siguientes posiciones concentran conocimiento o autoridad sin respaldo identificado: ` +
        spof.map((p) => `"${p.puesto}"${p.area ? ` (${p.area})` : ''}`).join(' · ') + '. ' +
        `Un punto único de falla convierte un evento personal ordinario —una incapacidad médica, una renuncia, unas vacaciones— ` +
        `en una interrupción operativa. El riesgo no es hipotético: es la probabilidad, cercana a uno en un horizonte de varios años, ` +
        `de que al menos una de estas personas se ausente de forma no planeada. ` +
        `Este hallazgo además interactúa con el detector de capacidad: una posición crítica sin respaldo NO es candidata a ` +
        `ninguna medida de reducción, por más holgura aparente que muestre.`,
      metodo: 'Identificación de concentración estructural: nodos con alta centralidad de reporte y alta densidad de responsabilidades sin respaldo declarado',
      calculo:
        spof.map((p) => `"${p.puesto}": ${(hijos.get(p.id) || []).length} reportes directos, ${(p.responsabilidades || []).length} responsabilidades declaradas, marcado crítico: ${p.critico === true}`).join(' · ') + '. ' +
        `Exposición de ingreso estimada: ${ingresoExpuesto ? round(ingresoExpuesto, 2) : 'no cuantificada'} ` +
        `(8% de los ingresos por posición crítica, con tope del 35%; supuesto parametrizable, no dato observado).`,
      datosUsados: ['personal[].{critico, responsabilidades}', 'grafo de reportaA'],
      n: personal.length,
      nivelEvidencia: 'INDICIO',
      factorISD: info.factorConfianza,
      componentesImpacto: ingresoExpuesto ? [{
        concepto: 'Ingreso en riesgo por interrupción derivada de ausencia no planeada (valor esperado en horizonte de un año)',
        min: ingresoExpuesto * 0.02, mode: ingresoExpuesto * 0.06, max: ingresoExpuesto * 0.15,
      }] : [],
      ingresosAnuales: ingresos,
      esfuerzo: 3,
      playbook: 'eliminar_spof',
      accionLegal: 'rediseñar_estructura',
      contexto: {
        posicionesCriticas: spof.map((p) => ({ puesto: p.puesto, area: p.area, reportesDirectos: (hijos.get(p.id) || []).length, responsabilidades: (p.responsabilidades || []).length })),
        proteccionMinima: 'Documentación de procesos críticos, suplente designado y formado, y prueba real del respaldo mediante ausencia planificada.',
      },
    }));
  }

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    cobertura: {
      nodos: personal.length, gerentes: gerentes.length,
      capasObservadas, tramoPromedio: tramos.length ? round(mean(tramos.map((t) => t.n)), 2) : null,
      ratioGerencial: personal.length ? round(gerentes.length / personal.length, 3) : null,
      isd: info.isd,
    },
    marcoConceptual:
      'La estructura es un mecanismo de decisión, no un mapa de estatus. Se evalúa por la latencia que introduce entre ' +
      'la detección de un problema y la autoridad para resolverlo, y por el costo de coordinación que impone (Brooks: n(n−1)/2).',
  };
}
