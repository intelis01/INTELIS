/**
 * DETECTOR 3 · GASTOS INNECESARIOS, FUGAS Y ANOMALÍAS DE DESEMBOLSO
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿qué desembolsos no compran resultado, cuáles crecen
 * sin razón, y cuáles presentan patrones que exigen revisión forense?
 *
 * La tesis operativa del detector: un gasto es "necesario" si su magnitud
 * responde a un DRIVER de actividad. Cuando la regresión entre el gasto y su
 * driver no es significativa, el gasto no está siendo causado por la operación
 * — es estructural, inercial u ocioso. Esa es una prueba, no una opinión.
 *
 * Métodos: clasificación ABC de Pareto · regresión MCO gasto~driver con
 * inferencia · tendencia de Mann-Kendall vs. crecimiento de ingresos ·
 * Z robusto por MAD · Ley de Benford con χ² y MAD de Nigrini.
 */

import {
  paretoABC, linreg, mannKendall, robustZ, median, mad, benford, clean,
  sum, mean, round, isNum, cagr,
} from '../core/stats.js';
import { FINANCIERO, COSTO_DISFUNCION } from '../data/benchmarks.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

export function detectarGastos(d, isd) {
  const dom = 'gastos';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const gastos = (d.gastos || []).filter((g) => isNum(g.monto) && g.monto > 0);
  const ingresos = d.finanzas?.ingresos;
  const gastoTotal = d.finanzas?.gastosOperacion ?? sum(gastos.map((g) => g.monto));
  const moneda = d.empresa?.moneda || 'MXN';
  const H = [];

  const abc = paretoABC(gastos, 'monto');
  const claseA = abc.filter((g) => g.clase === 'A');

  /* ═══ 3.1 GASTO SIN DRIVER: la prueba central del detector ══════════ */
  gastos.forEach((g) => {
    const y = clean(g.serie), x = clean(g.driver);
    if (y.length < 4 || x.length !== y.length) return;

    const r = linreg(x, y);
    if (!r.applicable) return;

    // Gasto que NO responde al driver ⇒ componente fijo no explicado por actividad.
    if (!r.significant || r.r2 < 0.30) {
      // La porción fija es el intercepto: gasto que existe aunque la actividad sea cero.
      const fijoAnual = Math.max(0, r.intercept) * (12 / Math.max(1, y.length)) * y.length;
      const fijoEstimado = Math.max(0, r.intercept) * 12;
      const proporcionFija = mean(y) > 0 ? Math.min(1, Math.max(0, r.intercept) / mean(y)) : 0;

      H.push(hallazgo({
        dominio: dom, tipo: 'gasto_sin_driver',
        titulo: `"${g.concepto}" no responde a su driver de actividad (${g.driverNombre || 'driver declarado'})`,
        descripcion:
          `La regresión del gasto contra su propio driver de actividad NO es estadísticamente significativa ` +
          `(p = ${round(r.p, 4)}, R² = ${round(r.r2, 3)}). En términos operativos: cuando la actividad sube o baja, ` +
          `este gasto no la sigue. El ${pct(proporcionFija)} del desembolso es componente fijo que se incurre ` +
          `con independencia de lo que la operación demande — aproximadamente ${fmt(fijoEstimado, moneda)} al año. ` +
          `Esto no prueba que el gasto sea inútil, pero sí desplaza la carga de la prueba: si no lo causa la actividad, ` +
          `alguien debe poder explicar qué lo causa. Un gasto sin causa declarable es un gasto sin dueño.`,
        metodo: 'Regresión lineal por mínimos cuadrados ordinarios del gasto contra su driver de actividad, con prueba t sobre la pendiente',
        calculo:
          `Modelo: gasto = β₀ + β₁·(${g.driverNombre || 'driver'}). ` +
          `β₀ = ${round(r.intercept, 2)} (componente fijo) · β₁ = ${round(r.slope, 4)} (componente variable) · ` +
          `EE(β₁) = ${round(r.seSlope, 4)} · t = β₁/EE(β₁) = ${round(r.t, 3)} con ${r.df} gl · p = ${round(r.p, 5)}. ` +
          `R² = ${round(r.r2, 4)} (R² ajustado = ${round(r.adjR2, 4)}): el driver explica solo el ${pct(r.r2)} de la variación del gasto. ` +
          `Componente fijo anualizado = β₀ × 12 = ${round(fijoEstimado, 2)}. ` +
          `NOTA DE VALIDEZ: con n = ${r.n} observaciones la potencia es limitada; un p alto puede reflejar falta de datos ` +
          `y no ausencia de relación. Se reporta como indicio que exige revisión documental, no como prueba de innecesariedad.`,
        datosUsados: [`gastos["${g.concepto}"].serie (n=${r.n})`, `gastos["${g.concepto}"].driver`],
        n: r.n, pValor: r.p,
        nivelEvidencia: r.n >= 12 ? 'ESTADISTICA' : 'INDICIO',
        factorISD: info.factorConfianza,
        componentesImpacto: fijoEstimado > 0 ? [{
          concepto: `Componente fijo sin causa de actividad en "${g.concepto}"`,
          min: fijoEstimado * 0.15, mode: fijoEstimado * 0.35, max: fijoEstimado * 0.70,
        }] : [],
        ingresosAnuales: ingresos,
        esfuerzo: 2,
        playbook: 'racionalizar_gasto',
        accionLegal: 'cancelar_gasto_proveedor',
        contexto: {
          partida: g.concepto, categoria: g.categoria, proveedor: g.proveedor ?? null,
          montoAnual: round(g.monto), r2: round(r.r2, 4), pendiente: round(r.slope, 4),
          intercepto: round(r.intercept, 2), pValor: round(r.p, 5),
          proporcionFija: round(proporcionFija, 3),
          contratoVence: g.contratoVence ?? null,
          justificacionRegistrada: g.justificacionOperativa ?? 'NO DECLARADA',
          supuestoRango: 'El rango de impacto (15%–70% del componente fijo) refleja que parte de ese gasto puede ser genuinamente necesario aunque no escale con el driver medido. No se asume que todo sea eliminable.',
        },
      }));
    }
  });

  /* ═══ 3.2 GASTO QUE CRECE MÁS RÁPIDO QUE EL INGRESO ═════════════════ */
  gastos.forEach((g) => {
    const s = clean(g.serie);
    if (s.length < 8) return;
    const mk = mannKendall(s);
    if (!mk.applicable || !mk.significant || mk.senSlope <= 0) return;

    const crecGasto = mean(s) > 0 ? (mk.senSlope * s.length) / mean(s) : 0;
    const crecIngreso = d.comercial?.crecimientoAnual ?? null;
    if (crecIngreso === null || crecGasto <= crecIngreso) return;

    const exceso = crecGasto - crecIngreso;
    const gastoExcedente = g.monto * exceso;

    H.push(hallazgo({
      dominio: dom, tipo: 'desacople_gasto_ingreso',
      titulo: `"${g.concepto}" crece ${pct(exceso)} más rápido que los ingresos`,
      descripcion:
        `Esta partida muestra una tendencia creciente significativa (Mann-Kendall p = ${round(mk.p, 4)}) a razón de ` +
        `${round(mk.senSlope, 2)} por periodo, equivalente a ${pct(crecGasto)} sobre el nivel medio. Los ingresos crecen ` +
        `${pct(crecIngreso)}. El desacople de ${pct(exceso)} significa que cada peso adicional de venta está costando ` +
        `progresivamente más. De sostenerse, esta sola partida consume ${fmt(gastoExcedente, moneda)} anuales de margen ` +
        `que antes no consumía. Un gasto que escala más rápido que el ingreso es una erosión de margen programada.`,
      metodo: 'Prueba de tendencia de Mann-Kendall con pendiente de Theil-Sen, contrastada contra la tasa de crecimiento de ingresos',
      calculo:
        `S = ${mk.S} · Z = ${round(mk.Z, 3)} · p = ${round(mk.p, 5)}. ` +
        `Pendiente Theil-Sen = ${round(mk.senSlope, 4)}/periodo sobre media ${round(mean(s), 2)} ⇒ crecimiento relativo = ${round(crecGasto, 4)}. ` +
        `Crecimiento de ingresos = ${round(crecIngreso, 4)}. Desacople = ${round(exceso, 4)}. ` +
        `Margen erosionado ≈ monto × desacople = ${round(g.monto, 2)} × ${round(exceso, 4)} = ${round(gastoExcedente, 2)}.`,
      datosUsados: [`gastos["${g.concepto}"].serie`, 'comercial.crecimientoAnual'],
      n: mk.n, pValor: mk.p,
      nivelEvidencia: 'ESTADISTICA',
      factorISD: info.factorConfianza,
      componentesImpacto: [{
        concepto: `Erosión de margen por desacople de "${g.concepto}"`,
        min: gastoExcedente * 0.5, mode: gastoExcedente, max: gastoExcedente * 1.6,
      }],
      ingresosAnuales: ingresos,
      esfuerzo: 2,
      playbook: 'racionalizar_gasto',
      accionLegal: 'cancelar_gasto_proveedor',
      contexto: { partida: g.concepto, crecimientoGasto: round(crecGasto, 4), crecimientoIngreso: round(crecIngreso, 4), desacople: round(exceso, 4) },
    }));
  });

  /* ═══ 3.3 ATÍPICOS POR CATEGORÍA (Z robusto con MAD) ════════════════ */
  const porCategoria = {};
  gastos.forEach((g) => {
    const k = g.categoria || 'sin categoría';
    (porCategoria[k] = porCategoria[k] || []).push(g);
  });
  Object.entries(porCategoria).forEach(([cat, items]) => {
    if (items.length < 5) return;
    const montos = items.map((g) => g.monto);
    const m = median(montos), s = mad(montos, true);
    if (!s) return;
    items.forEach((g) => {
      const z = robustZ(g.monto, montos);
      if (z <= 3.5) return;
      const excedente = g.monto - m;
      H.push(hallazgo({
        dominio: dom, tipo: 'gasto_atipico',
        titulo: `Desembolso atípico en "${cat}": ${g.concepto} está ${round(z, 1)} desviaciones sobre la mediana`,
        descripcion:
          `Dentro de su propia categoría (n = ${items.length}), esta partida de ${fmt(g.monto, moneda)} se desvía ` +
          `${round(z, 2)} desviaciones robustas de la mediana de ${fmt(m, moneda)}. El umbral convencional de atipicidad ` +
          `es |Z| > 3.5 (Iglewicz y Hoaglin). El excedente sobre la mediana de su categoría es de ${fmt(excedente, moneda)}. ` +
          `Se usa el Z robusto y no el Z clásico porque la desviación estándar ordinaria es arrastrada por el propio ` +
          `valor extremo que se busca detectar, enmascarándolo. Esto identifica una anomalía que requiere explicación; ` +
          `no determina por sí solo que el gasto sea improcedente.`,
        metodo: 'Z robusto basado en la Desviación Absoluta Mediana (MAD), comparación intra-categoría',
        calculo:
          `mediana(${cat}) = ${round(m, 2)} · MAD escalada = 1.4826 × mediana|xᵢ − mediana| = ${round(s, 2)} · ` +
          `Z = (${round(g.monto, 2)} − ${round(m, 2)})/${round(s, 2)} = ${round(z, 3)}. ` +
          `Umbral |Z| > 3.5 (Iglewicz & Hoaglin, 1993). Punto de ruptura del estimador: 50%.`,
        datosUsados: [`gastos filtrados por categoria="${cat}" (n=${items.length})`],
        n: items.length,
        nivelEvidencia: 'ESTADISTICA',
        factorISD: info.factorConfianza,
        componentesImpacto: [{
          concepto: `Excedente sobre la mediana de la categoría "${cat}"`,
          min: excedente * 0.2, mode: excedente * 0.5, max: excedente * 0.9,
        }],
        ingresosAnuales: ingresos,
        esfuerzo: 1,
        playbook: 'auditar_partida',
        accionLegal: 'cancelar_gasto_proveedor',
        contexto: { partida: g.concepto, categoria: cat, monto: round(g.monto), medianaCategoria: round(m), zRobusto: round(z, 3), proveedor: g.proveedor ?? null },
      }));
    });
  });

  /* ═══ 3.4 ANÁLISIS FORENSE DE FACTURACIÓN (Benford) ═════════════════ */
  gastos.filter((g) => clean(g.facturas).length >= 50).forEach((g) => {
    const b = benford(g.facturas);
    if (!b.applicable || !b.anomalous) return;
    H.push(hallazgo({
      dominio: dom, tipo: 'anomalia_benford',
      titulo: `Patrón de facturación anómalo en "${g.concepto}"${g.proveedor ? ` (${g.proveedor})` : ''}`,
      descripcion:
        `La distribución del primer dígito de ${b.n} facturas se aparta significativamente de la Ley de Benford ` +
        `(χ² = ${round(b.chi2, 2)} con 8 gl, p = ${round(b.p, 5)}; MAD de Nigrini = ${round(b.mad, 5)}, clasificación "${b.conformity}"). ` +
        `Los conjuntos de importes generados de forma natural siguen P(d) = log₁₀(1 + 1/d). Una desviación de esta magnitud ` +
        `es compatible con: (a) importes fabricados, (b) fraccionamiento deliberado para quedar bajo umbrales de autorización, ` +
        `(c) redondeo sistemático o precios de lista fijos, o (d) numeración secuencial. ` +
        `ADVERTENCIA METODOLÓGICA: esto es un INDICIO que ordena una revisión, NO prueba de irregularidad. ` +
        `Las causas (c) y (d) son legítimas y frecuentes. La revisión debe descartarlas primero.`,
      metodo: 'Prueba de conformidad con la Ley de Benford (primer dígito): χ² de bondad de ajuste con 8 gl y MAD de Nigrini',
      calculo:
        `n = ${b.n}. Distribución esperada P(d) = log₁₀(1+1/d). ` +
        `Observado vs. esperado por dígito: ${b.observed.map((o, i) => `${i + 1}:${o}/${round(b.expected[i], 1)}`).join(' · ')}. ` +
        `χ² = Σ(O−E)²/E = ${round(b.chi2, 3)} · p = ${round(b.p, 5)}. ` +
        `MAD = (1/9)Σ|proporción observada − esperada| = ${round(b.mad, 5)}. ` +
        `Umbrales de Nigrini: <0.006 conformidad cercana; 0.006–0.012 aceptable; 0.012–0.015 marginal; >0.015 no conforme.`,
      datosUsados: [`gastos["${g.concepto}"].facturas (n=${b.n})`],
      n: b.n, pValor: b.p,
      nivelEvidencia: 'INDICIO',
      factorISD: info.factorConfianza,
      componentesImpacto: [{
        // Magnitud anclada al parámetro de referencia de fraude ocupacional de ACFE,
        // aplicado únicamente a la partida bajo sospecha, no a los ingresos totales.
        concepto: `Exposición potencial en la partida bajo revisión (referencia ACFE: 5% de pérdida típica)`,
        min: g.monto * 0.01, mode: g.monto * 0.05, max: g.monto * 0.15,
      }],
      ingresosAnuales: ingresos,
      esfuerzo: 3,
      playbook: 'revision_forense',
      accionLegal: 'cancelar_gasto_proveedor',
      contexto: {
        partida: g.concepto, proveedor: g.proveedor ?? null,
        chi2: round(b.chi2, 3), p: round(b.p, 5), madNigrini: round(b.mad, 5), conformidad: b.conformity,
        distribucion: b.observed.map((o, i) => ({ digito: i + 1, observado: o, esperado: round(b.expected[i], 1), observadoPct: round(b.observedPct[i], 4), esperadoPct: round(b.expectedPct[i], 4) })),
        referenciaACFE: `${COSTO_DISFUNCION.fraudeOcupacional.fuente}: pérdida típica del 5% de ingresos anuales; 43% de los casos se detectan por denuncia.`,
        obligacionFiscal: 'Antes de cualquier acción: cotejar al proveedor contra los listados definitivos del artículo 69-B del CFF publicados por el SAT, y documentar la materialidad del servicio recibido.',
      },
    }));
  });

  /* ═══ 3.5 CONCENTRACIÓN DEL GASTO (foco de negociación) ═════════════ */
  if (claseA.length && gastos.length >= 8) {
    const montoA = sum(claseA.map((g) => g.valor));
    const totalDet = sum(abc.map((g) => g.valor));
    H.push(hallazgo({
      dominio: dom, tipo: 'concentracion_gasto',
      titulo: `El ${pct(claseA.length / gastos.length)} de las partidas concentra el ${pct(montoA / totalDet)} del gasto`,
      descripcion:
        `La clasificación ABC identifica ${claseA.length} partidas de clase A (${pct(claseA.length / gastos.length)} del total) ` +
        `que suman ${fmt(montoA, moneda)}, el ${pct(montoA / totalDet)} del gasto analizado. ` +
        `Implicación de gestión: el esfuerzo de negociación y control debe concentrarse aquí. ` +
        `Una mejora del 5% en las partidas A libera ${fmt(montoA * 0.05, moneda)}; la misma mejora aplicada a TODAS las partidas C ` +
        `libera solo ${fmt(sum(abc.filter((g) => g.clase === 'C').map((g) => g.valor)) * 0.05, moneda)}. ` +
        `Repartir la atención por igual entre todas las partidas es, matemáticamente, la peor asignación de esfuerzo posible.`,
      metodo: 'Clasificación ABC de Pareto sobre el valor acumulado (A ≤ 80%, B ≤ 95%, C resto)',
      calculo:
        `Total analizado = ${round(totalDet, 2)} sobre ${gastos.length} partidas. ` +
        `Clase A: ${claseA.length} partidas = ${round(montoA, 2)} (${pct(montoA / totalDet)}). ` +
        `Partidas A: ${claseA.slice(0, 8).map((g) => `${g.concepto} (${pct(g.participacion)})`).join(' · ')}` +
        `${claseA.length > 8 ? ` y ${claseA.length - 8} más` : ''}.`,
      datosUsados: ['gastos[].monto'],
      n: gastos.length,
      nivelEvidencia: 'DETERMINISTA',
      factorISD: info.factorConfianza,
      componentesImpacto: [{
        concepto: 'Ahorro por renegociación focalizada en clase A (rango conservador de 3% a 12%)',
        min: montoA * 0.03, mode: montoA * 0.06, max: montoA * 0.12,
      }],
      ingresosAnuales: ingresos,
      esfuerzo: 2,
      playbook: 'renegociar_clase_a',
      accionLegal: 'cancelar_gasto_proveedor',
      contexto: {
        tablaABC: abc.map((g) => ({ partida: g.concepto, categoria: g.categoria, monto: round(g.valor), participacion: round(g.participacion, 4), acumulado: round(g.acumulado, 4), clase: g.clase })),
        claseA: claseA.length, claseB: abc.filter((g) => g.clase === 'B').length, claseC: abc.filter((g) => g.clase === 'C').length,
      },
    }));
  }

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    cobertura: {
      partidasAnalizadas: gastos.length,
      montoAnalizado: round(sum(gastos.map((g) => g.monto))),
      coberturaSobreGastoOperacion: gastoTotal > 0 ? round(sum(gastos.map((g) => g.monto)) / gastoTotal, 3) : null,
      conSerieTemporal: gastos.filter((g) => clean(g.serie).length >= 6).length,
      conDriver: gastos.filter((g) => clean(g.driver).length >= 3).length,
      conFacturasParaBenford: gastos.filter((g) => clean(g.facturas).length >= 50).length,
      isd: info.isd,
    },
    marcoConceptual:
      'Un gasto se justifica por su causa, no por su costumbre. El detector exige que cada partida material ' +
      'demuestre una relación estadística con un driver de actividad; la ausencia de esa relación invierte la carga de la prueba.',
  };
}
