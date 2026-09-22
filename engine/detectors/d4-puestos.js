/**
 * DETECTOR 4 · CAPACIDAD DE PLANTILLA MAL ASIGNADA
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿dónde la capacidad humana contratada no corresponde a
 * la demanda real de trabajo — por exceso o por defecto?
 *
 * PRINCIPIO ÉTICO Y METODOLÓGICO DEL DETECTOR
 * ────────────────────────────────────────────
 * Este módulo NO identifica "personas innecesarias". Identifica CAPACIDAD
 * SOBRANTE O FALTANTE EN UNA FUNCIÓN, que es una propiedad del diseño del
 * trabajo, no del individuo. La distinción tiene tres consecuencias prácticas:
 *
 *   1. La primera solución propuesta ante capacidad sobrante es SIEMPRE la
 *      reasignación hacia el déficit detectado, no la separación.
 *   2. Todo ahorro se reporta NETO del costo legal de terminación (LFT arts. 48,
 *      50, 162), porque el ahorro bruto es una ficción contable.
 *   3. La sobrecarga (déficit de capacidad) se trata con la MISMA severidad que
 *      el exceso, y se vincula a la obligación patronal de la NOM-035-STPS-2018
 *      y a la evidencia médica OMS/OIT sobre jornadas prolongadas.
 *
 * Métodos: cálculo de FTE requerido con factor de utilización efectiva ·
 * eficiencia relativa tipo DEA sobre la frontera observada · índice de
 * duplicidad de Jaccard · costeo laboral conforme a la LFT.
 */

import { jaccard, mean, median, round, isNum, clean, sum, quantile } from '../core/stats.js';
import { SALUD_OCUPACIONAL, COSTO_DISFUNCION, ESTRUCTURA } from '../data/benchmarks.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

/**
 * Costo legal de terminación conforme a la Ley Federal del Trabajo (México).
 *
 * Se calculan DOS escenarios, porque presentar solo uno induce a error:
 *   · CONVENIO (art. 53-I): mutuo consentimiento ratificado. Cierra la
 *     contingencia con certeza. Se modela con finiquito + prima de antigüedad
 *     + una gratificación de negociación.
 *   · LITIGIO ADVERSO (arts. 48 y 50): el trabajador demanda y obtiene sentencia
 *     favorable. Es el techo de exposición que debe provisionarse.
 *
 * ADVERTENCIA: cálculo orientativo. Los montos definitivos dependen del salario
 * integrado, la antigüedad exacta, prestaciones superiores a la ley y el
 * criterio del tribunal. Requiere validación de abogado laboralista.
 */
export function costoTerminacionLFT({ salarioDiario, antiguedadAños, salarioMinimoDiario = 278.80, probabilidadLitigio = 0.35 }) {
  if (!isNum(salarioDiario) || !isNum(antiguedadAños)) {
    return { calculable: false, razon: 'Se requieren salarioDiario y antiguedadAños' };
  }
  const sd = salarioDiario;
  const años = Math.max(0, antiguedadAños);

  // Prima de antigüedad (art. 162 LFT): 12 días por año, con salario topado a 2 SM.
  const salarioTopado = Math.min(sd, 2 * salarioMinimoDiario);
  const primaAntiguedad = 12 * salarioTopado * años;

  // Partes proporcionales (finiquito): se devengan en todo escenario.
  const aguinaldoProp = (15 / 365) * sd * 365 * 0.5;       // aprox. medio ejercicio devengado
  const diasVacaciones = años < 1 ? 12 : Math.min(20, 12 + 2 * Math.floor(años));  // art. 76 reformado
  const vacacionesProp = diasVacaciones * sd * 0.5;
  const primaVacacional = vacacionesProp * 0.25;            // art. 80: 25% sobre vacaciones
  const finiquito = aguinaldoProp + vacacionesProp + primaVacacional;

  // Indemnización constitucional (art. 48) y 20 días por año (art. 50-III).
  const tresMeses = 90 * sd;
  const veinteDiasPorAño = 20 * sd * años;

  // Salarios vencidos: tope de 12 meses (art. 48 reformado DOF 30-XI-2012).
  const salariosVencidosTope = 365 * sd;

  const escenarioConvenio = finiquito + primaAntiguedad + tresMeses * 0.5;
  const escenarioLiquidacionLey = finiquito + primaAntiguedad + tresMeses + veinteDiasPorAño;
  const escenarioLitigioAdverso = escenarioLiquidacionLey + salariosVencidosTope;

  const esperado = (1 - probabilidadLitigio) * escenarioConvenio + probabilidadLitigio * escenarioLitigioAdverso;

  return {
    calculable: true,
    componentes: {
      primaAntiguedad: round(primaAntiguedad),
      finiquitoProporcionales: round(finiquito),
      indemnizacion3Meses: round(tresMeses),
      veinteDiasPorAño: round(veinteDiasPorAño),
      salariosVencidosTope12Meses: round(salariosVencidosTope),
    },
    escenarios: {
      convenio: round(escenarioConvenio),
      liquidacionConformeALey: round(escenarioLiquidacionLey),
      litigioAdverso: round(escenarioLitigioAdverso),
    },
    esperado: round(esperado),
    probabilidadLitigioSupuesta: probabilidadLitigio,
    baseLegal: [
      'LFT art. 48 — indemnización de 3 meses y salarios vencidos hasta por 12 meses',
      'LFT art. 50-III — 20 días de salario por cada año de servicios',
      'LFT art. 162 — prima de antigüedad de 12 días por año, salario topado a 2 salarios mínimos',
      'LFT art. 76 — vacaciones conforme a la reforma vigente desde el 1-I-2023',
      'LFT art. 53-I — terminación por mutuo consentimiento (vía de convenio)',
    ],
    advertencia:
      'Cálculo ORIENTATIVO con salario diario nominal. El monto real depende del salario integrado, prestaciones ' +
      'superiores a la ley, antigüedad exacta y criterio judicial. La probabilidad de litigio es un SUPUESTO ' +
      'parametrizable, no un dato observado. Requiere validación de abogado laboralista antes de provisionar o ejecutar.',
  };
}

export function detectarPuestos(d, isd) {
  const dom = 'puestos';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const personal = (d.personal || []);
  const ingresos = d.finanzas?.ingresos;
  const moneda = d.empresa?.moneda || 'MXN';
  const smd = d.empresa?.salarioMinimoDiario ?? 278.80;
  const H = [];

  const conCarga = personal.filter((p) => isNum(p.demandaHorasSemana) && isNum(p.horasSemana) && p.horasSemana > 0);

  /* ═══ 4.1 DÉFICIT DE CAPACIDAD: SOBRECARGA ══════════════════════════ */
  // Se evalúa PRIMERO y de forma deliberada: el riesgo de salud y la
  // exposición legal por sobrecarga preceden a cualquier oportunidad de ahorro.
  const sobrecargados = conCarga.filter((p) => p.demandaHorasSemana / p.horasSemana > 1.15);
  if (sobrecargados.length) {
    const jornadasCriticas = sobrecargados.filter((p) => p.demandaHorasSemana >= SALUD_OCUPACIONAL.jornadaLargaRiesgo.umbralHoras);
    const costoRotacion = sum(sobrecargados.map((p) => (p.costoAnual || 0))) * 0.5; // extremo bajo del rango SHRM
    const fteFaltante = sum(sobrecargados.map((p) => (p.demandaHorasSemana - p.horasSemana) / p.horasSemana));

    H.push(hallazgo({
      dominio: dom, tipo: 'sobrecarga_estructural',
      titulo: `Déficit de capacidad: ${sobrecargados.length} función(es) operan con carga superior a la contratada`,
      descripcion:
        `${sobrecargados.length} puesto(s) presentan una demanda de trabajo que excede en más de 15% las horas contratadas: ` +
        sobrecargados.map((p) => `"${p.puesto}" al ${pct(p.demandaHorasSemana / p.horasSemana)} (${p.demandaHorasSemana} h vs. ${p.horasSemana} h)`).join(' · ') + '. ' +
        `El déficit agregado equivale a ${round(fteFaltante, 2)} FTE. ` +
        (jornadasCriticas.length
          ? `CRÍTICO — ${jornadasCriticas.length} función(es) superan las ${SALUD_OCUPACIONAL.jornadaLargaRiesgo.umbralHoras} horas semanales. ` +
            `Las estimaciones conjuntas OMS/OIT asocian esa jornada con un ${pct(SALUD_OCUPACIONAL.jornadaLargaRiesgo.riesgoACV - 1)} más de riesgo de ` +
            `accidente cerebrovascular y ${pct(SALUD_OCUPACIONAL.jornadaLargaRiesgo.riesgoCardiopatia - 1)} más de riesgo de muerte por cardiopatía isquémica, ` +
            `frente a jornadas de 35 a 40 horas. Esto deja de ser una cuestión de productividad. `
          : '') +
        `En México, una carga de trabajo estructuralmente excesiva constituye un factor de riesgo psicosocial que el patrón ` +
        `está OBLIGADO a identificar, analizar y prevenir conforme a la NOM-035-STPS-2018. No es una preferencia de gestión.`,
      metodo: 'Comparación de demanda de horas contra capacidad contratada, con evaluación de umbral de riesgo epidemiológico OMS/OIT',
      calculo:
        sobrecargados.map((p) => `"${p.puesto}": utilización = ${p.demandaHorasSemana}/${p.horasSemana} = ${round(p.demandaHorasSemana / p.horasSemana, 3)}`).join(' · ') +
        `. FTE faltante = Σ(demanda − contratada)/contratada = ${round(fteFaltante, 3)}. ` +
        `Costo de reemplazo si la sobrecarga deriva en rotación: se aplica el extremo BAJO del rango de literatura ` +
        `(0.5× el salario anual, ${COSTO_DISFUNCION.desercionLaboralCosto.fuente}) sobre el costo de los puestos afectados.`,
      datosUsados: sobrecargados.map((p) => `personal["${p.puesto}"].{demandaHorasSemana, horasSemana}`),
      n: conCarga.length,
      nivelEvidencia: 'DETERMINISTA',
      factorISD: info.factorConfianza,
      componentesImpacto: [{
        concepto: 'Costo esperado de rotación inducida por sobrecarga sostenida',
        min: costoRotacion * 0.3, mode: costoRotacion * 0.6, max: costoRotacion * 1.2,
      }],
      ingresosAnuales: ingresos,
      seguridadPersonas: jornadasCriticas.length > 0,
      bloqueaLegal: true,
      esfuerzo: 3,
      playbook: 'corregir_sobrecarga',
      accionLegal: 'rediseñar_estructura',
      contexto: {
        puestosAfectados: sobrecargados.map((p) => ({
          puesto: p.puesto, area: p.area,
          horasContratadas: p.horasSemana, horasDemandadas: p.demandaHorasSemana,
          utilizacion: round(p.demandaHorasSemana / p.horasSemana, 3),
          superaUmbralOMS: p.demandaHorasSemana >= SALUD_OCUPACIONAL.jornadaLargaRiesgo.umbralHoras,
        })),
        fteFaltante: round(fteFaltante, 2),
        sustentoMedico: {
          hallazgo: SALUD_OCUPACIONAL.jornadaLargaRiesgo.descripcion,
          fuente: SALUD_OCUPACIONAL.jornadaLargaRiesgo.fuente,
          año: SALUD_OCUPACIONAL.jornadaLargaRiesgo.año,
          muestra: SALUD_OCUPACIONAL.jornadaLargaRiesgo.muestra,
          burnout: `${SALUD_OCUPACIONAL.burnout.descripcion} (${SALUD_OCUPACIONAL.burnout.clasificacion}, código ${SALUD_OCUPACIONAL.burnout.codigo}).`,
        },
        obligacionNormativa: 'NOM-035-STPS-2018: identificación, análisis y prevención de factores de riesgo psicosocial. Obligación patronal vigente, con escalamiento según número de trabajadores.',
      },
    }));
  }

  /* ═══ 4.2 CAPACIDAD SOBRANTE ═══════════════════════════════════════ */
  const subutilizados = conCarga.filter((p) => p.demandaHorasSemana / p.horasSemana < 0.65 && isNum(p.costoAnual));
  subutilizados.forEach((p) => {
    const u = p.demandaHorasSemana / p.horasSemana;
    const fteOcioso = 1 - u;
    const costoOcioso = p.costoAnual * fteOcioso;

    const costoSalida = costoTerminacionLFT({
      salarioDiario: p.salarioDiario ?? (p.costoAnual / 365 / 1.35), // estimación si no se declara: costo empresa ÷ factor de carga social
      antiguedadAños: p.antiguedadAños ?? 3,
      salarioMinimoDiario: smd,
    });

    // Destino preferente: absorber el déficit detectado en 4.1.
    const puedeReasignarse = sobrecargados.length > 0;

    H.push(hallazgo({
      dominio: dom, tipo: 'capacidad_sobrante',
      titulo: `Capacidad sobrante en la función "${p.puesto}"${p.area ? ` (${p.area})` : ''}: utilización ${pct(u)}`,
      descripcion:
        `La demanda de trabajo medida para esta función es de ${p.demandaHorasSemana} horas semanales contra ${p.horasSemana} contratadas: ` +
        `una utilización del ${pct(u)} que deja ${round(fteOcioso, 2)} FTE sin demanda asignada, equivalente a ${fmt(costoOcioso, moneda)} anuales ` +
        `de costo sin contraprestación de trabajo. ` +
        (puedeReasignarse
          ? `RUTA PREFERENTE: existe déficit de capacidad detectado en otras funciones de esta misma organización. La reasignación ` +
            `captura el valor SIN incurrir en costo de terminación, sin pérdida de conocimiento institucional y sin exposición legal. ` +
            `Es, en términos estrictos de valor presente, la opción dominante.`
          : `No se detectó déficit de capacidad en otras funciones que pueda absorber esta holgura. Antes de considerar una reducción, ` +
            `debe agotarse la ampliación del alcance del puesto y la verificación de que la medición de demanda sea representativa ` +
            `(estacionalidad, picos no capturados, trabajo no registrado).`) + ' ' +
        (costoSalida.calculable
          ? `Si se optara por la separación, el costo esperado es de ${fmt(costoSalida.esperado, moneda)} ` +
            `(convenio ${fmt(costoSalida.escenarios.convenio, moneda)} · liquidación conforme a ley ${fmt(costoSalida.escenarios.liquidacionConformeALey, moneda)} · ` +
            `litigio adverso ${fmt(costoSalida.escenarios.litigioAdverso, moneda)}), lo que implica un periodo de recuperación de ` +
            `${round(costoSalida.esperado / Math.max(1, costoOcioso), 2)} años sobre el ahorro anual. ` +
            `El ahorro NETO del primer año es ${fmt(costoOcioso - costoSalida.esperado, moneda)}.`
          : ''),
      metodo: 'Cálculo de FTE ocioso por utilización medida, con costeo de terminación conforme a la Ley Federal del Trabajo en tres escenarios',
      calculo:
        `Utilización = demanda/contratada = ${p.demandaHorasSemana}/${p.horasSemana} = ${round(u, 4)}. ` +
        `FTE ocioso = 1 − ${round(u, 4)} = ${round(fteOcioso, 4)}. ` +
        `Costo ocioso anual = costo total del puesto × FTE ocioso = ${round(p.costoAnual, 2)} × ${round(fteOcioso, 4)} = ${round(costoOcioso, 2)}. ` +
        (costoSalida.calculable
          ? `Costo de terminación esperado = (1−p)·convenio + p·litigio, con p = ${costoSalida.probabilidadLitigioSupuesta} ⇒ ${round(costoSalida.esperado, 2)}. ` +
            `Desglose: prima de antigüedad ${round(costoSalida.componentes.primaAntiguedad)} · proporcionales ${round(costoSalida.componentes.finiquitoProporcionales)} · ` +
            `3 meses ${round(costoSalida.componentes.indemnizacion3Meses)} · 20 días/año ${round(costoSalida.componentes.veinteDiasPorAño)}.`
          : ''),
      datosUsados: [`personal["${p.puesto}"].{demandaHorasSemana, horasSemana, costoAnual, antiguedadAños}`],
      n: conCarga.length,
      nivelEvidencia: 'DETERMINISTA',
      factorISD: info.factorConfianza,
      componentesImpacto: [{
        // El rango es deliberadamente conservador: rara vez el 100% de la holgura
        // medida es capturable, porque existe trabajo no registrado y estacionalidad.
        concepto: `Valor anual de la capacidad recuperable en "${p.puesto}"`,
        min: costoOcioso * 0.35, mode: costoOcioso * 0.65, max: costoOcioso * 0.95,
      }],
      ingresosAnuales: ingresos,
      esfuerzo: puedeReasignarse ? 2 : 5,
      playbook: puedeReasignarse ? 'reasignar_capacidad_humana' : 'redimensionar_funcion',
      accionLegal: puedeReasignarse ? 'rediseñar_estructura' : 'reducir_plantilla',
      contexto: {
        puesto: p.puesto, area: p.area, nivel: p.nivel ?? null,
        utilizacion: round(u, 4), fteOcioso: round(fteOcioso, 3),
        costoAnualPuesto: round(p.costoAnual), costoOciosoAnual: round(costoOcioso),
        rutaPreferente: puedeReasignarse ? 'REASIGNACIÓN (dominante: captura el valor sin costo de terminación ni exposición legal)' : 'AMPLIACIÓN DE ALCANCE antes de considerar reducción',
        costoTerminacionLFT: costoSalida,
        ahorroNetoPrimerAño: costoSalida.calculable ? round(costoOcioso - costoSalida.esperado) : null,
        salvedadDeMedicion:
          'Una utilización baja puede reflejar una medición incompleta de la demanda (trabajo no registrado, guardias, ' +
          'picos estacionales fuera de la ventana medida) antes que una holgura real. Verificar la representatividad ' +
          'del periodo medido ANTES de tomar cualquier decisión sobre personas.',
      },
    }));
  });

  /* ═══ 4.3 DUPLICIDAD DE RESPONSABILIDADES ══════════════════════════ */
  const conResp = personal.filter((p) => (p.responsabilidades || []).length >= 2);
  const pares = [];
  for (let i = 0; i < conResp.length; i++) {
    for (let j = i + 1; j < conResp.length; j++) {
      const s = jaccard(conResp[i].responsabilidades, conResp[j].responsabilidades);
      if (s >= 0.45) pares.push({ a: conResp[i], b: conResp[j], j: s });
    }
  }
  pares.sort((x, y) => y.j - x.j).slice(0, 6).forEach((par) => {
    const comunes = par.a.responsabilidades.filter((r) =>
      par.b.responsabilidades.some((s) => String(s).toLowerCase().trim() === String(r).toLowerCase().trim()));
    const costoMenor = Math.min(par.a.costoAnual || 0, par.b.costoAnual || 0);
    const costoDuplicado = costoMenor * par.j;

    H.push(hallazgo({
      dominio: dom, tipo: 'duplicidad_responsabilidades',
      titulo: `Solapamiento del ${pct(par.j)} entre "${par.a.puesto}" y "${par.b.puesto}"`,
      descripcion:
        `El índice de Jaccard entre las responsabilidades declaradas de ambos puestos es de ${round(par.j, 3)}: ` +
        `comparten ${comunes.length} de ${new Set([...par.a.responsabilidades, ...par.b.responsabilidades].map((s) => String(s).toLowerCase().trim())).size} responsabilidades distintas. ` +
        `Coincidencias: ${comunes.slice(0, 5).join(', ')}${comunes.length > 5 ? '…' : ''}. ` +
        `La duplicidad tiene tres costos, y el monetario es el menor de ellos: (1) trabajo ejecutado dos veces; ` +
        `(2) difusión de responsabilidad — cuando dos personas son responsables de lo mismo, en la práctica ninguna lo es, ` +
        `y las tareas caen entre las sillas; (3) conflicto de criterio ante decisiones. ` +
        `La corrección estándar NO es eliminar un puesto: es asignar un único responsable (accountable) por resultado mediante una matriz RACI.`,
      metodo: 'Índice de similitud de Jaccard sobre conjuntos de responsabilidades declaradas',
      calculo:
        `J(A,B) = |A∩B|/|A∪B| = ${comunes.length}/${new Set([...par.a.responsabilidades, ...par.b.responsabilidades].map((s) => String(s).toLowerCase().trim())).size} = ${round(par.j, 4)}. ` +
        `Umbral de reporte: J ≥ 0.45. Costo asociado estimado = costo del puesto menor × J = ${round(costoMenor, 2)} × ${round(par.j, 3)} = ${round(costoDuplicado, 2)}.`,
      datosUsados: [`personal["${par.a.puesto}"].responsabilidades`, `personal["${par.b.puesto}"].responsabilidades`],
      nivelEvidencia: 'DETERMINISTA',
      factorISD: info.factorConfianza,
      componentesImpacto: [{
        concepto: `Esfuerzo duplicado entre "${par.a.puesto}" y "${par.b.puesto}"`,
        min: costoDuplicado * 0.15, mode: costoDuplicado * 0.35, max: costoDuplicado * 0.60,
      }],
      ingresosAnuales: ingresos,
      esfuerzo: 2,
      playbook: 'clarificar_responsabilidades',
      accionLegal: 'rediseñar_estructura',
      contexto: {
        puestoA: par.a.puesto, puestoB: par.b.puesto,
        areaA: par.a.area, areaB: par.b.area,
        jaccard: round(par.j, 4), responsabilidadesComunes: comunes,
        correccionRecomendada: 'Matriz RACI con un único responsable (A) por resultado. La duplicidad se resuelve asignando, no despidiendo.',
      },
    }));
  });

  /* ═══ 4.4 FRONTERA DE EFICIENCIA (DEA simplificado) ════════════════ */
  const conProduccion = personal.filter((p) => isNum(p.produccion) && isNum(p.costoAnual) && p.costoAnual > 0);
  if (conProduccion.length >= 4) {
    const porArea = {};
    conProduccion.forEach((p) => { (porArea[p.area || 'general'] = porArea[p.area || 'general'] || []).push(p); });
    Object.entries(porArea).filter(([, g]) => g.length >= 4).forEach(([area, grupo]) => {
      const ratios = grupo.map((p) => ({ p, r: p.produccion / p.costoAnual }));
      const frontera = Math.max(...ratios.map((x) => x.r));
      const evaluados = ratios.map((x) => ({ ...x, eficiencia: x.r / frontera }));
      const rezagados = evaluados.filter((x) => x.eficiencia < 0.60);
      if (!rezagados.length) return;

      const brechaTotal = sum(rezagados.map((x) => x.p.costoAnual * (1 - x.eficiencia)));

      H.push(hallazgo({
        dominio: dom, tipo: 'brecha_eficiencia',
        titulo: `Dispersión de eficiencia en "${area}": ${rezagados.length} de ${grupo.length} unidades por debajo del 60% de la frontera`,
        descripcion:
          `Comparando producción por peso de costo dentro del área, la unidad más eficiente alcanza ${round(frontera, 4)} unidades ` +
          `de producción por peso. ${rezagados.length} unidad(es) operan por debajo del 60% de esa frontera: ` +
          rezagados.map((x) => `"${x.p.puesto}" al ${pct(x.eficiencia)}`).join(' · ') + '. ' +
          `LECTURA CORRECTA: una brecha de eficiencia entre pares que hacen el mismo trabajo con las mismas herramientas ` +
          `casi nunca es un problema de capacidad individual. Las causas habituales, en orden de frecuencia, son: ` +
          `diferencias en la mezcla de trabajo asignada, acceso desigual a herramientas o información, y diferencias de ` +
          `capacitación. Cerrar la brecha mediante transferencia de las prácticas de la unidad frontera es la intervención ` +
          `con mayor retorno y menor riesgo. ` +
          `LIMITACIÓN DEL MÉTODO: este es un DEA de una sola entrada y una sola salida. No controla por complejidad, ` +
          `antigüedad de cartera ni dificultad del territorio. Debe verificarse la comparabilidad antes de actuar.`,
        metodo: 'Análisis Envolvente de Datos simplificado (una entrada, una salida): eficiencia relativa contra la frontera observada del grupo',
        calculo:
          `Razón individual rᵢ = producción/costo. Frontera = máx(rᵢ) = ${round(frontera, 5)}. ` +
          `Eficiencia relativa θᵢ = rᵢ/frontera. ` +
          grupo.map((p) => `"${p.puesto}": ${round(p.produccion, 1)}/${round(p.costoAnual, 0)} = ${round(p.produccion / p.costoAnual, 5)} ⇒ θ = ${round((p.produccion / p.costoAnual) / frontera, 3)}`).join(' · ') + '. ' +
          `Brecha valorizada = Σ costoᵢ × (1 − θᵢ) para θᵢ < 0.60 = ${round(brechaTotal, 2)}.`,
        datosUsados: [`personal filtrado por area="${area}" con producción y costo (n=${grupo.length})`],
        n: grupo.length,
        nivelEvidencia: 'MODELO',
        factorISD: info.factorConfianza,
        componentesImpacto: [{
          concepto: `Valor recuperable al cerrar parcialmente la brecha de eficiencia en "${area}"`,
          min: brechaTotal * 0.15, mode: brechaTotal * 0.35, max: brechaTotal * 0.60,
        }],
        ingresosAnuales: ingresos,
        esfuerzo: 3,
        playbook: 'transferir_practicas',
        accionLegal: 'rediseñar_estructura',
        contexto: {
          area, frontera: round(frontera, 5),
          unidades: evaluados.map((x) => ({ puesto: x.p.puesto, produccion: round(x.p.produccion, 1), costo: round(x.p.costoAnual), razon: round(x.r, 5), eficiencia: round(x.eficiencia, 3) })),
          unidadFrontera: evaluados.find((x) => x.eficiencia === 1)?.p.puesto,
          limitacion: 'DEA de una entrada y una salida: no controla por complejidad del trabajo, calidad del resultado ni condiciones del territorio. Verificar comparabilidad antes de decidir.',
        },
      }));
    });
  }

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    cobertura: {
      plantillaAnalizada: personal.length,
      conMedicionDeCarga: conCarga.length,
      conResponsabilidadesDeclaradas: conResp.length,
      conProduccionMedible: conProduccion.length,
      costoLaboralTotal: round(sum(personal.map((p) => p.costoAnual || 0))),
      isd: info.isd,
    },
    marcoConceptual:
      'El detector evalúa el AJUSTE entre demanda de trabajo y capacidad contratada, no el desempeño de personas. ' +
      'La reasignación domina a la separación siempre que exista déficit en otra función, porque captura el mismo valor ' +
      'sin costo de terminación, sin pérdida de conocimiento y sin exposición legal.',
    salvedadEtica:
      'Ningún hallazgo de este dominio constituye una recomendación de despido. Son insumos cuantitativos para una decisión ' +
      'de diseño organizacional que corresponde tomar a la dirección, con validación jurídica previa y considerando ' +
      'información que este motor no posee: desempeño individual, trayectoria, potencial y contexto.',
  };
}
