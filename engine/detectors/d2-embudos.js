/**
 * DETECTOR 2 · EMBUDOS, CUELLOS DE BOTELLA Y RESTRICCIONES
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿qué etapa gobierna el throughput del sistema completo,
 * y cuánto valor se pierde en cada transición del embudo?
 *
 * Fundamento: Teoría de Restricciones (Goldratt, 1984). Un sistema rinde lo que
 * rinde su eslabón más lento. Optimizar cualquier otra etapa no aumenta el
 * resultado global: solo acumula inventario o costo. Por eso este detector marca
 * explícitamente cuál hallazgo ES la restricción — y el motor de priorización
 * duplica su apalancamiento.
 *
 * Métodos: identificación de restricción por utilización ρ=λ/μ · colas M/M/1 y
 * M/M/c (Erlang C) · Ley de Little · conversión por etapa con IC de Wilson ·
 * valor de la fuga por etapa.
 */

import { mm1, erlangC, erlangStaffing, normalInv, round, isNum, clean, sum } from '../core/stats.js';
import { CALIDAD } from '../data/benchmarks.js';
import { periodicidadDe } from '../core/schema.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

/**
 * Intervalo de confianza de Wilson para una proporción.
 * Se prefiere sobre el IC normal (Wald) porque Wald falla catastróficamente
 * con proporciones cercanas a 0 o 1 y con muestras pequeñas — exactamente las
 * condiciones de las últimas etapas de un embudo comercial.
 * Ref: Wilson (1927), JASA 22(158); Agresti & Coull (1998).
 */
export function wilsonCI(exitos, n, alpha = 0.05) {
  if (!(n > 0)) return { lo: NaN, hi: NaN, p: NaN };
  const z = normalInv(1 - alpha / 2);
  const p = exitos / n;
  const d = 1 + (z * z) / n;
  const centro = (p + (z * z) / (2 * n)) / d;
  const margen = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { p, lo: Math.max(0, centro - margen), hi: Math.min(1, centro + margen), z, n };
}

export function detectarEmbudos(d, isd) {
  const dom = 'embudos';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const ingresos = d.finanzas?.ingresos;
  const moneda = d.empresa?.moneda || 'MXN';
  const perProc = periodicidadDe(d, 'procesos', 'mensual');
  const perEmb  = periodicidadDe(d, 'embudo', 'anual');
  const H = [];

  /* ═══ 2.1 IDENTIFICACIÓN DE LA RESTRICCIÓN DEL SISTEMA ═══════════════ */
  const etapasFlujo = (d.procesos || []).filter((p) => isNum(p.tasaLlegada) && isNum(p.capacidad) && p.capacidad > 0);
  let restriccion = null;

  if (etapasFlujo.length >= 2) {
    // CAPACIDAD EFECTIVA, no nominal.
    // Una etapa que produce defectos consume capacidad en unidades que después
    // se desechan o retrabajan: su capacidad útil es menor que la instalada.
    //     capacidad efectiva = capacidad nominal × rendimiento
    //     rendimiento = 1 − defectos/(unidades × oportunidades)
    // Ignorar esto desplaza la identificación de la restricción hacia la etapa
    // equivocada, que es el error más caro posible en Teoría de Restricciones:
    // toda la inversión de mejora se dirige a un lugar donde no eleva el
    // throughput del sistema.
    const util = etapasFlujo.map((p) => {
      const nominal = p.capacidad * (p.servidores || 1);
      const rendimiento = (isNum(p.defectos) && isNum(p.unidades) && p.unidades > 0)
        ? Math.max(0.01, 1 - p.defectos / (p.unidades * (p.oportunidades || 1)))
        : 1;
      const efectiva = nominal * rendimiento;
      return {
        ...p, nombre: p.nombre || p.id,
        capacidadNominal: nominal, rendimiento, capacidadEfectiva: efectiva,
        rhoNominal: p.tasaLlegada / nominal,
        rho: p.tasaLlegada / efectiva,
      };
    }).sort((a, b) => b.rho - a.rho);

    restriccion = util[0];
    const segunda = util[1];
    const throughputSistema = Math.min(...util.map((p) => p.capacidadEfectiva));
    const demanda = Math.max(...util.map((p) => p.tasaLlegada));
    const demandaNoAtendida = Math.max(0, demanda - throughputSistema);

    if (restriccion.rho >= CALIDAD.utilizacionCritica.umbral) {
      const q = (restriccion.servidores || 1) > 1
        ? erlangC(restriccion.tasaLlegada, restriccion.capacidad, restriccion.servidores)
        : mm1(restriccion.tasaLlegada, restriccion.capacidad);
      const valorUnit = (d.embudo || []).find((e) => isNum(e.valorUnitario))?.valorUnitario ?? null;
      const margen = d.comercial?.margenBrutoPct ?? 0.5;

      const comps = (valorUnit && demandaNoAtendida > 0)
        ? [{ concepto: `Margen no capturado por demanda que la restricción no procesa (${round(demandaNoAtendida, 1)} unid./periodo)`,
             min: demandaNoAtendida * perProc.factor * valorUnit * margen * 0.6,
             mode: demandaNoAtendida * perProc.factor * valorUnit * margen,
             max: demandaNoAtendida * perProc.factor * valorUnit * margen * 1.3 }]
        : [];

      H.push(hallazgo({
        dominio: dom, tipo: 'restriccion_sistema',
        titulo: `RESTRICCIÓN DEL SISTEMA: "${restriccion.nombre}" opera al ${pct(restriccion.rho)} de utilización`,
        descripcion:
          `"${restriccion.nombre}" es el eslabón que gobierna el throughput de toda la cadena. Con ρ = ${round(restriccion.rho, 3)} ` +
          `sobre su capacidad EFECTIVA (la siguiente etapa más cargada está en ${pct(segunda.rho)}), el sistema entero no puede producir más de ` +
          `${round(throughputSistema, 1)} unidades por periodo, aunque el resto de las etapas tenga capacidad ociosa. ` +
          (q.estable
            ? `La fila esperada frente a esta etapa es de ${round(q.Lq, 2)} unidades con una espera de ${round(q.Wq, 3)} periodos. `
            : `ρ ≥ 1: la cola es teóricamente infinita. El trabajo se acumula sin límite y los plazos se degradan de forma continua. `) +
          `La demanda no atendida asciende a ${round(demandaNoAtendida, 1)} unidades por periodo. ` +
          `CONSECUENCIA DE PRIORIZACIÓN: toda mejora aplicada a cualquier OTRA etapa no incrementará el resultado del sistema.`,
        metodo: 'Identificación de restricción por utilización comparada + modelo de colas ' +
          ((restriccion.servidores || 1) > 1 ? 'M/M/c (Erlang C)' : 'M/M/1'),
        calculo:
          `Rendimiento = 1 − defectos/(unidades×oportunidades) = ${round(restriccion.rendimiento, 4)}. ` +
          `Capacidad efectiva = capacidad nominal × rendimiento = ${round(restriccion.capacidadNominal, 2)} × ${round(restriccion.rendimiento, 4)} = ${round(restriccion.capacidadEfectiva, 2)}. ` +
          `ρ = λ/capacidad efectiva = ${round(restriccion.tasaLlegada, 2)}/${round(restriccion.capacidadEfectiva, 2)} = ${round(restriccion.rho, 4)} ` +
          `(contra ρ nominal de ${round(restriccion.rhoNominal, 4)}: la diferencia es la capacidad que los defectos consumen y devuelven en forma de retrabajo). ` +
          (q.estable
            ? `Lq = ${round(q.Lq, 3)} · Wq = ${round(q.Wq, 4)} · L = ${round(q.L, 3)} (Ley de Little: L = λ·W). `
            : `Sistema inestable: ρ ≥ 1. `) +
          `Throughput del sistema = mín(capacidades) = ${round(throughputSistema, 2)}/periodo. ` +
          `Demanda = ${round(demanda, 2)}/periodo ⇒ no atendida = ${round(demandaNoAtendida, 2)}/periodo. ` +
          `Sensibilidad hiperbólica: Lq(ρ=0.80)=3.2, Lq(0.90)=8.1, Lq(0.95)=18.05 — reducir ρ tiene rendimientos crecientes.`,
        datosUsados: etapasFlujo.map((p) => `procesos["${p.nombre || p.id}"].{tasaLlegada, capacidad, servidores}`),
        nivelEvidencia: 'MODELO',
        factorISD: info.factorConfianza,
        componentesImpacto: comps,
        ingresosAnuales: ingresos,
        esRestriccion: true,
        esfuerzo: 3,
        playbook: 'elevar_restriccion',
        contexto: {
          etapa: restriccion.nombre, rho: round(restriccion.rho, 4),
          throughputSistema: round(throughputSistema, 2),
          demandaNoAtendida: round(demandaNoAtendida, 2),
          rendimiento: round(restriccion.rendimiento, 4),
          capacidadNominal: round(restriccion.capacidadNominal, 2),
          capacidadEfectiva: round(restriccion.capacidadEfectiva, 2),
          utilizacionPorEtapa: util.map((p) => ({
            etapa: p.nombre, rhoEfectiva: round(p.rho, 3), rhoNominal: round(p.rhoNominal, 3),
            rendimiento: round(p.rendimiento, 4),
            capacidadNominal: round(p.capacidadNominal, 2), capacidadEfectiva: round(p.capacidadEfectiva, 2),
          })),
          notaCapacidadEfectiva:
            'La restricción se identifica sobre la capacidad EFECTIVA (nominal × rendimiento), no sobre la nominal. ' +
            'Una etapa que produce defectos gasta capacidad en unidades que luego se retrabajan o desechan. ' +
            'Usar la capacidad nominal desplaza la identificación hacia la etapa equivocada, y dirige toda la inversión ' +
            'de mejora a un lugar donde no eleva el throughput del sistema.',
          cincoPasosTOC: [
            '1. IDENTIFICAR la restricción — hecho: es "' + restriccion.nombre + '".',
            '2. EXPLOTAR la restricción: eliminar de ella todo trabajo que no requiera su capacidad única.',
            '3. SUBORDINAR el resto del sistema al ritmo de la restricción (no producir más de lo que ella puede absorber).',
            '4. ELEVAR la restricción: agregar capacidad solo después de agotar los pasos 2 y 3.',
            '5. VOLVER AL PASO 1: al elevarla, la restricción se desplaza a otra etapa. No permitir que la inercia se vuelva la nueva restricción.',
          ],
          advertenciaSubordinacion:
            'Las etapas con ρ bajo NO deben acelerarse. Producir por encima del ritmo de la restricción solo genera inventario en proceso, que es capital inmovilizado disfrazado de productividad.',
        },
      }));
    }

    /* ── 2.2 Capacidad ociosa estructural (el espejo del cuello) ───────── */
    util.filter((p) => p.rho < 0.35 && p !== restriccion).forEach((p) => {
      H.push(hallazgo({
        dominio: dom, tipo: 'capacidad_ociosa',
        titulo: `Capacidad ociosa estructural en "${p.nombre}": ρ = ${pct(p.rho)}`,
        descripcion:
          `Esta etapa usa solo el ${pct(p.rho)} de su capacidad instalada. Se está pagando por ` +
          `${round((1 - p.rho) * 100)}% de capacidad que no se consume. ` +
          `MATIZ OBLIGATORIO: en Teoría de Restricciones, cierta ociosidad en las no-restricciones es NECESARIA y deseable, ` +
          `porque protege a la restricción de quedarse sin alimentación. El hallazgo es accionable solo si esta etapa ` +
          `no alimenta a la restricción o si su holgura excede con mucho el amortiguador requerido. ` +
          `Antes de recortar aquí: verificar que no se está eliminando el amortiguador que sostiene el throughput.`,
        metodo: 'Utilización comparada contra el umbral de holgura estructural',
        calculo: `Capacidad efectiva = ${round(p.capacidadNominal, 2)} × rendimiento ${round(p.rendimiento, 4)} = ${round(p.capacidadEfectiva, 2)}. ` +
          `ρ = λ/capacidad efectiva = ${round(p.tasaLlegada, 2)}/${round(p.capacidadEfectiva, 2)} = ${round(p.rho, 4)}. Capacidad no utilizada = ${pct(1 - p.rho)}.`,
        datosUsados: [`procesos["${p.nombre}"].{tasaLlegada, capacidad, servidores}`],
        nivelEvidencia: 'DETERMINISTA',
        factorISD: info.factorConfianza,
        ingresosAnuales: ingresos,
        esfuerzo: 3,
        playbook: 'reasignar_capacidad',
        accionLegal: 'rediseñar_estructura',
        contexto: { etapa: p.nombre, rho: round(p.rho, 4), rhoNominal: round(p.rhoNominal, 4), rendimiento: round(p.rendimiento, 4), holguraCapacidad: pct(1 - p.rho) },
      }));
    });

    /* ── 2.3 Dimensionamiento de servidores (Erlang) ───────────────────── */
    etapasFlujo.filter((p) => (p.servidores || 1) > 1 && isNum(p.nivelServicioObjetivo)).forEach((p) => {
      const req = erlangStaffing(p.tasaLlegada, p.capacidad, p.nivelServicioObjetivo, p.tiempoObjetivo || 1);
      const actual = erlangC(p.tasaLlegada, p.capacidad, p.servidores);
      if (req.c && req.c !== p.servidores) {
        const delta = req.c - p.servidores;
        H.push(hallazgo({
          dominio: dom, tipo: 'dimensionamiento_incorrecto',
          titulo: `Dimensionamiento incorrecto en "${p.nombre || p.id}": ${delta > 0 ? 'faltan' : 'sobran'} ${Math.abs(delta)} posición(es)`,
          descripcion:
            `Para cumplir el objetivo de atender el ${pct(p.nivelServicioObjetivo)} en ${p.tiempoObjetivo || 1} periodo(s), ` +
            `Erlang C exige ${req.c} servidores. Hoy hay ${p.servidores}. ` +
            (delta > 0
              ? `El déficit implica que la probabilidad de espera actual es de ${pct(actual.pWait || 1)}: el nivel de servicio prometido es matemáticamente inalcanzable con la plantilla vigente.`
              : `El excedente representa capacidad pagada por encima del compromiso de servicio.`),
          metodo: 'Fórmula de Erlang C (modelo M/M/c) para dimensionamiento con objetivo de nivel de servicio',
          calculo:
            `a = λ/μ = ${round(p.tasaLlegada / p.capacidad, 3)} erlangs. ` +
            `C(c,a) = [aᶜ/(c!(1−ρ))] / [Σₖ₌₀ᶜ⁻¹ aᵏ/k! + aᶜ/(c!(1−ρ))]. ` +
            `Con c = ${p.servidores}: P(espera) = ${round(actual.pWait || 1, 4)}. ` +
            `Con c = ${req.c}: nivel de servicio alcanzado = ${pct(req.slAlcanzado || 0)}.`,
          datosUsados: [`procesos["${p.nombre || p.id}"]`],
          nivelEvidencia: 'MODELO',
          factorISD: info.factorConfianza,
          ingresosAnuales: ingresos,
          esfuerzo: 2,
          playbook: delta > 0 ? 'ampliar_capacidad_servicio' : 'reasignar_capacidad',
          accionLegal: delta < 0 ? 'rediseñar_estructura' : null,
          contexto: { etapa: p.nombre || p.id, servidoresActuales: p.servidores, servidoresRequeridos: req.c, delta },
        }));
      }
    });
  }

  /* ═══ 2.4 FUGAS DEL EMBUDO COMERCIAL ════════════════════════════════ */
  const emb = (d.embudo || []).filter((e) => isNum(e.volumen));
  if (emb.length >= 2) {
    const trans = [];
    for (let i = 1; i < emb.length; i++) {
      const de = emb[i - 1], a = emb[i];
      const ci = wilsonCI(a.volumen, de.volumen);
      trans.push({
        de: de.etapa, a: a.etapa,
        entra: de.volumen, sale: a.volumen,
        perdidos: de.volumen - a.volumen,
        conv: ci.p, lo: ci.lo, hi: ci.hi,
        valorUnitario: a.valorUnitario ?? de.valorUnitario ?? null,
      });
    }
    const convGlobal = emb[emb.length - 1].volumen / emb[0].volumen;
    // La transición más débil relativa a la mediana de las transiciones.
    const convs = trans.map((t) => t.conv).sort((x, y) => x - y);
    const medConv = convs[Math.floor(convs.length / 2)];
    const peor = trans.reduce((a, b) => (a.conv < b.conv ? a : b));
    const valorFinal = emb[emb.length - 1].valorUnitario ?? emb.find((e) => isNum(e.valorUnitario))?.valorUnitario ?? null;
    const margen = d.comercial?.margenBrutoPct ?? 0.5;

    trans.forEach((t) => {
      // Se reporta una fuga cuando la conversión de la transición es
      // significativamente peor que la mediana del propio embudo — es decir,
      // el embudo se compara consigo mismo, no contra un benchmark ajeno.
      const brechaRel = medConv > 0 ? (medConv - t.conv) / medConv : 0;
      if (brechaRel < 0.35 || t.conv >= 0.9) return;

      // Recuperar la mitad de la brecha hasta la mediana es la hipótesis base.
      const convObjetivo = t.conv + (medConv - t.conv) * 0.5;
      const unidadesRecuperables = t.entra * (convObjetivo - t.conv);
      // Propagación por el resto del embudo hasta la conversión final.
      let factorResto = 1;
      const idx = trans.indexOf(t);
      for (let k = idx + 1; k < trans.length; k++) factorResto *= trans[k].conv;
      const cierresAdicionales = unidadesRecuperables * factorResto;

      const comps = (valorFinal && cierresAdicionales > 0)
        ? [{ concepto: `Margen adicional por recuperar la mitad de la brecha en "${t.de} → ${t.a}"`,
             min: cierresAdicionales * perEmb.factor * valorFinal * margen * 0.4,
             mode: cierresAdicionales * perEmb.factor * valorFinal * margen,
             max: cierresAdicionales * perEmb.factor * valorFinal * margen * 1.5 }]
        : [];

      H.push(hallazgo({
        dominio: dom, tipo: 'fuga_embudo',
        titulo: `Fuga en el embudo: "${t.de} → ${t.a}" convierte ${pct(t.conv)}`,
        descripcion:
          `De ${t.entra} unidades que entran a "${t.de}", solo ${t.sale} llegan a "${t.a}": se pierden ${t.perdidos} ` +
          `(${pct(1 - t.conv)}). La conversión de esta transición es ${pct(brechaRel)} inferior a la mediana del propio embudo (${pct(medConv)}), ` +
          `lo que la señala como el punto de menor rendimiento relativo del proceso comercial. ` +
          `Intervalo de confianza de Wilson al 95%: [${pct(t.lo)}, ${pct(t.hi)}] — ` +
          (t.hi < medConv
            ? `el límite superior queda por debajo de la mediana, por lo que la diferencia NO es atribuible al azar muestral.`
            : `el intervalo alcanza la mediana: con este volumen, parte de la diferencia podría deberse a variación muestral. Ampliar la medición antes de invertir.`) +
          ` Cerrar la mitad de la brecha generaría aproximadamente ${round(cierresAdicionales, 1)} cierres adicionales por periodo.`,
        metodo: 'Análisis de conversión por transición con intervalo de confianza de Wilson y comparación intra-embudo contra la mediana',
        calculo:
          `Conversión = ${t.sale}/${t.entra} = ${round(t.conv, 4)}. ` +
          `IC Wilson 95% = [${round(t.lo, 4)}, ${round(t.hi, 4)}] (se usa Wilson y no Wald porque Wald no cubre correctamente proporciones extremas). ` +
          `Mediana del embudo = ${round(medConv, 4)}; brecha relativa = ${round(brechaRel, 3)}. ` +
          `Objetivo (cerrar 50% de la brecha) = ${round(convObjetivo, 4)} ⇒ ${round(unidadesRecuperables, 2)} unidades adicionales, ` +
          `que al propagarse por el resto del embudo (factor ${round(factorResto, 4)}) producen ${round(cierresAdicionales, 2)} cierres/periodo. ` +
          `Conversión global del embudo = ${round(convGlobal, 5)} (${pct(convGlobal, 2)}).`,
        datosUsados: [`embudo["${t.de}"].volumen`, `embudo["${t.a}"].volumen`],
        n: t.entra,
        nivelEvidencia: t.hi < medConv ? 'ESTADISTICA' : 'BENCHMARK',
        factorISD: info.factorConfianza,
        componentesImpacto: comps,
        ingresosAnuales: ingresos,
        esRestriccion: false,
        esfuerzo: 2,
        playbook: 'cerrar_fuga_embudo',
        accionLegal: 'cambiar_promesa_comercial',
        contexto: {
          transicion: `${t.de} → ${t.a}`,
          conversion: round(t.conv, 4), ic95: [round(t.lo, 4), round(t.hi, 4)],
          medianaEmbudo: round(medConv, 4), perdidos: t.perdidos,
          conversionGlobal: round(convGlobal, 5),
          esPeorTransicion: t === peor,
          tablaEmbudo: trans.map((x) => ({ transicion: `${x.de} → ${x.a}`, entra: x.entra, sale: x.sale, conversion: round(x.conv, 4) })),
        },
      }));
    });
  }

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    restriccionIdentificada: restriccion ? (restriccion.nombre || restriccion.id) : null,
    cobertura: { etapasDeFlujo: etapasFlujo.length, etapasDeEmbudo: emb.length, periodicidadProcesos: perProc, periodicidadEmbudo: perEmb, isd: info.isd },
    marcoConceptual:
      'Teoría de Restricciones (Goldratt): el throughput del sistema lo fija su eslabón más lento. ' +
      'Toda mejora fuera de la restricción es una mejora local sin efecto global. ' +
      'Teoría de colas (Kingman): por encima de ρ=0.8 la espera crece de forma hiperbólica, no lineal.',
  };
}
