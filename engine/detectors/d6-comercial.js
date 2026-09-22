/**
 * DETECTOR 6 · ESTRATEGIAS COMERCIALES ERRÓNEAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿el motor comercial crea o destruye valor por cada
 * peso que consume, y dónde exactamente?
 *
 * La falla comercial más costosa no es vender poco: es vender con economía
 * unitaria negativa. Escalar un modelo cuyo LTV es menor que su CAC acelera la
 * destrucción de valor — crecer empeora el resultado. Este detector verifica
 * primero la unidad económica y solo después el volumen.
 *
 * Métodos: LTV/CAC y periodo de recuperación · descomposición de la retención ·
 * concentración HHI · contribución marginal por canal contra el ROAS de
 * equilibrio · elasticidad precio por regresión log-log · Regla del 40.
 */

import { linreg, hhi, shannonEvenness, round, isNum, sum, mean, clean } from '../core/stats.js';
import { COMERCIAL } from '../data/benchmarks.js';
import { periodicidadDe } from '../core/schema.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

export function detectarComercial(d, isd) {
  const dom = 'comercial';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const c = d.comercial || {};
  const ingresos = d.finanzas?.ingresos;
  const moneda = d.empresa?.moneda || 'MXN';
  const factorComercial = periodicidadDe(d, 'comercial', 'anual').factor;
  const H = [];

  /* ═══ 6.1 ECONOMÍA UNITARIA ═════════════════════════════════════════ */
  let ltv = null, ratio = null, paybackMeses = null;
  if (isNum(c.cac) && isNum(c.margenBrutoPct) && isNum(c.ingresoPromedioCliente) && isNum(c.churnMensual) && c.churnMensual > 0) {
    const margenMensual = c.ingresoPromedioCliente * c.margenBrutoPct;
    const vidaMeses = 1 / c.churnMensual;
    ltv = margenMensual * vidaMeses;
    ratio = ltv / c.cac;
    paybackMeses = c.cac / margenMensual;

    if (ratio < COMERCIAL.ltvCac.minimoViable) {
      const clientesAño = c.nuevosClientesPeriodo ? c.nuevosClientesPeriodo * factorComercial : null;
      // Destrucción de valor por cohorte: cada cliente adquirido bajo esta economía.
      const destruccionPorCliente = Math.max(0, c.cac * COMERCIAL.ltvCac.minimoViable - ltv) / COMERCIAL.ltvCac.minimoViable;
      const brechaPorCliente = Math.max(0, c.cac - ltv);
      const destruccionAnual = clientesAño ? clientesAño * Math.max(brechaPorCliente, destruccionPorCliente) : null;

      H.push(hallazgo({
        dominio: dom, tipo: 'economia_unitaria_insuficiente',
        titulo: `Economía unitaria por debajo del umbral: LTV/CAC = ${round(ratio, 2)}×`,
        descripcion:
          `Cada cliente genera ${fmt(ltv, moneda)} de margen a lo largo de su vida y cuesta ${fmt(c.cac, moneda)} adquirirlo: ` +
          `una razón de ${round(ratio, 2)}× frente al mínimo viable de ${COMERCIAL.ltvCac.minimoViable}×. ` +
          (ratio < 1
            ? `POR DEBAJO DE 1×: cada cliente nuevo destruye ${fmt(c.cac - ltv, moneda)} de valor. En esta condición, ` +
              `aumentar la inversión comercial acelera la pérdida. Antes de vender más hay que arreglar la unidad económica: ` +
              `crecer es, literalmente, la peor decisión posible ahora mismo.`
            : `La razón es positiva pero insuficiente para absorber costos de estructura, fallas de ejecución y el costo del capital. ` +
              `El margen de error operativo es nulo.`) +
          ` El periodo de recuperación del CAC es de ${round(paybackMeses, 1)} meses ` +
          (paybackMeses > COMERCIAL.cacPayback.criticoMeses
            ? `— por encima del umbral crítico de ${COMERCIAL.cacPayback.criticoMeses} meses: el crecimiento consume caja más rápido de lo que la genera.`
            : `(referencia: ≤${COMERCIAL.cacPayback.pymeMeses} meses en PyME, ≤${COMERCIAL.cacPayback.empresarialMeses} en venta empresarial).`) +
          ` Las tres palancas, en orden de apalancamiento matemático: reducir churn (efecto hiperbólico sobre la vida del cliente), ` +
          `elevar margen o ticket (efecto lineal), reducir CAC (efecto lineal).`,
        metodo: 'Modelo de valor de vida del cliente con churn constante: LTV = (ARPU × margen bruto) / churn mensual',
        calculo:
          `Margen mensual por cliente = ${round(c.ingresoPromedioCliente, 2)} × ${round(c.margenBrutoPct, 4)} = ${round(margenMensual, 2)}. ` +
          `Vida esperada = 1/churn = 1/${round(c.churnMensual, 4)} = ${round(vidaMeses, 2)} meses. ` +
          `LTV = ${round(margenMensual, 2)} × ${round(vidaMeses, 2)} = ${round(ltv, 2)}. ` +
          `LTV/CAC = ${round(ltv, 2)}/${round(c.cac, 2)} = ${round(ratio, 3)}. ` +
          `Recuperación del CAC = ${round(c.cac, 2)}/${round(margenMensual, 2)} = ${round(paybackMeses, 2)} meses. ` +
          `SUPUESTO DEL MODELO: churn constante y sin descuento temporal. Si el churn es mayor en los primeros meses ` +
          `(patrón habitual), este LTV está SOBRESTIMADO y la situación real es peor que la reportada. ` +
          `Referencia de umbral: ${COMERCIAL.ltvCac.fuente} (${COMERCIAL.ltvCac.confianza}).`,
        datosUsados: ['comercial.{cac, margenBrutoPct, ingresoPromedioCliente, churnMensual}'],
        nivelEvidencia: 'MODELO',
        factorISD: info.factorConfianza,
        componentesImpacto: destruccionAnual ? [{
          concepto: 'Valor destruido anualmente por adquirir bajo la economía unitaria actual',
          min: destruccionAnual * 0.6, mode: destruccionAnual, max: destruccionAnual * 1.5,
        }] : [],
        ingresosAnuales: ingresos,
        esfuerzo: 3,
        playbook: 'corregir_economia_unitaria',
        accionLegal: 'cambiar_promesa_comercial',
        contexto: {
          ltv: round(ltv), cac: round(c.cac), ratio: round(ratio, 3),
          paybackMeses: round(paybackMeses, 2), vidaClienteMeses: round(vidaMeses, 1),
          margenMensualPorCliente: round(margenMensual, 2),
          sensibilidad: [
            { palanca: 'Reducir churn 20%', nuevoLtv: round(ltv / 0.8), nuevoRatio: round(ratio / 0.8, 2), efecto: 'HIPERBÓLICO: la vida del cliente es 1/churn, por lo que reducir churn tiene el mayor apalancamiento de las tres palancas.' },
            { palanca: 'Aumentar margen 20%', nuevoLtv: round(ltv * 1.2), nuevoRatio: round(ratio * 1.2, 2), efecto: 'LINEAL sobre el LTV.' },
            { palanca: 'Reducir CAC 20%', nuevoLtv: round(ltv), nuevoRatio: round(ratio / 0.8, 2), efecto: 'LINEAL sobre la razón; suele ser la palanca con menor techo.' },
          ],
          churnObjetivoPara3x: round(margenMensual / (COMERCIAL.ltvCac.minimoViable * c.cac), 4),
        },
      }));
    } else if (ratio > COMERCIAL.ltvCac.sobreinvertido) {
      H.push(hallazgo({
        dominio: dom, tipo: 'subinversion_comercial',
        titulo: `Subinversión en crecimiento: LTV/CAC = ${round(ratio, 2)}×`,
        descripcion:
          `La razón LTV/CAC de ${round(ratio, 2)}× supera ${COMERCIAL.ltvCac.sobreinvertido}×. Contra la intuición, esto no es una buena noticia sin matices: ` +
          `una razón tan alta suele indicar que se está dejando mercado sin capturar. La empresa podría invertir más en adquisición ` +
          `y seguir por encima del umbral de ${COMERCIAL.ltvCac.minimoViable}×. Margen de inversión adicional disponible por cliente: ` +
          `${fmt(ltv / COMERCIAL.ltvCac.minimoViable - c.cac, moneda)} antes de tocar el umbral mínimo. ` +
          `SALVEDAD: esta lectura solo aplica si existe demanda no atendida. Verificar el tamaño de mercado accesible y la capacidad ` +
          `de entrega antes de escalar la inversión: aumentar la adquisición sin capacidad de servicio convierte un buen negocio en churn.`,
        metodo: 'Razón LTV/CAC contra el rango de referencia de eficiencia de capital',
        calculo:
          `LTV/CAC = ${round(ltv, 2)}/${round(c.cac, 2)} = ${round(ratio, 3)}. ` +
          `CAC máximo manteniendo ${COMERCIAL.ltvCac.minimoViable}× = LTV/${COMERCIAL.ltvCac.minimoViable} = ${round(ltv / COMERCIAL.ltvCac.minimoViable, 2)}. ` +
          `Margen de inversión adicional por cliente = ${round(ltv / COMERCIAL.ltvCac.minimoViable - c.cac, 2)}.`,
        datosUsados: ['comercial.{cac, margenBrutoPct, ingresoPromedioCliente, churnMensual}'],
        nivelEvidencia: 'BENCHMARK',
        factorISD: info.factorConfianza,
        componentesImpacto: c.nuevosClientesPeriodo ? [{
          concepto: 'Margen adicional capturable al escalar adquisición hasta el umbral de 3×',
          min: c.nuevosClientesPeriodo * factorComercial * (ltv - c.cac) * 0.15,
          mode: c.nuevosClientesPeriodo * factorComercial * (ltv - c.cac) * 0.35,
          max: c.nuevosClientesPeriodo * factorComercial * (ltv - c.cac) * 0.70,
        }] : [],
        ingresosAnuales: ingresos,
        esfuerzo: 3,
        playbook: 'escalar_adquisicion',
        accionLegal: 'cambiar_promesa_comercial',
        contexto: { ltv: round(ltv), cac: round(c.cac), ratio: round(ratio, 3), cacMaximoSostenible: round(ltv / COMERCIAL.ltvCac.minimoViable) },
      }));
    }
  }

  /* ═══ 6.2 RETENCIÓN ═════════════════════════════════════════════════ */
  if (isNum(c.churnMensual) && c.churnMensual > 0) {
    const churnAnual = 1 - Math.pow(1 - c.churnMensual, 12);
    if (churnAnual > 0.30) {
      const baseClientes = isNum(ingresos) && isNum(c.ingresoPromedioCliente) && c.ingresoPromedioCliente > 0
        ? ingresos / (c.ingresoPromedioCliente * 12) : null;
      const margenPerdido = baseClientes && isNum(c.margenBrutoPct)
        ? baseClientes * churnAnual * c.ingresoPromedioCliente * 12 * c.margenBrutoPct : null;
      // Escenario: 5 puntos de mejora en retención (el experimento de Reichheld).
      const mejora5pp = margenPerdido ? margenPerdido * (0.05 / churnAnual) : null;

      H.push(hallazgo({
        dominio: dom, tipo: 'fuga_retencion',
        titulo: `Fuga de clientes: ${pct(churnAnual)} de abandono anual`,
        descripcion:
          `Un churn mensual de ${pct(c.churnMensual, 2)} compuesto a doce meses equivale a perder el ${pct(churnAnual)} de la base cada año. ` +
          `La vida media del cliente es de ${round(1 / c.churnMensual, 1)} meses. ` +
          (baseClientes ? `Sobre una base estimada de ${round(baseClientes)} clientes, se pierden aproximadamente ${round(baseClientes * churnAnual)} al año, ` +
            `equivalentes a ${fmt(margenPerdido, moneda)} de margen anual. ` : '') +
          `ORDEN DE PRIORIDAD: retener es la palanca dominante porque no tiene costo de adquisición. ` +
          `Reponer un cliente perdido cuesta el CAC completo (${isNum(c.cac) ? fmt(c.cac, moneda) : 'el CAC'}); retenerlo cuesta una fracción. ` +
          `La evidencia clásica de Reichheld y Sasser asocia un aumento de 5 puntos en retención con incrementos de utilidad ` +
          `de entre ${pct(COMERCIAL.retencionValor.rangoIncrementoUtilidad[0])} y ${pct(COMERCIAL.retencionValor.rangoIncrementoUtilidad[1])}, ` +
          `según el margen de contribución del sector.`,
        metodo: 'Composición del churn mensual a base anual y valorización del margen perdido',
        calculo:
          `Churn anual = 1 − (1 − ${round(c.churnMensual, 4)})¹² = ${round(churnAnual, 4)}. ` +
          `Vida media = 1/churn mensual = ${round(1 / c.churnMensual, 2)} meses. ` +
          (baseClientes ? `Base estimada = ingresos/(ARPU×12) = ${round(ingresos, 2)}/(${round(c.ingresoPromedioCliente, 2)}×12) = ${round(baseClientes, 1)} clientes. ` +
            `Margen perdido = base × churn anual × ARPU × 12 × margen = ${round(margenPerdido, 2)}. ` : '') +
          `Referencia: ${COMERCIAL.retencionValor.fuente}.`,
        datosUsados: ['comercial.churnMensual', 'comercial.ingresoPromedioCliente', 'finanzas.ingresos'],
        nivelEvidencia: 'DETERMINISTA',
        factorISD: info.factorConfianza,
        componentesImpacto: mejora5pp ? [{
          concepto: 'Margen recuperable al mejorar la retención en 5 puntos porcentuales',
          min: mejora5pp * 0.4, mode: mejora5pp * 0.8, max: mejora5pp * 1.3,
        }] : [],
        ingresosAnuales: ingresos,
        esfuerzo: 3,
        playbook: 'reducir_churn',
        accionLegal: 'cambiar_promesa_comercial',
        contexto: {
          churnMensual: round(c.churnMensual, 4), churnAnual: round(churnAnual, 4),
          vidaMediaMeses: round(1 / c.churnMensual, 1),
          clientesPerdidosAnuales: baseClientes ? round(baseClientes * churnAnual) : null,
          diagnosticoRequerido: 'El churn agregado oculta su causa. Segmentar por cohorte de ingreso, canal de adquisición y motivo declarado de baja ANTES de diseñar la intervención: el churn de los primeros 90 días es un problema de promesa o de activación; el churn tardío es un problema de valor entregado. Son padecimientos distintos con tratamientos opuestos.',
        },
      }));
    }
  }

  /* ═══ 6.3 CONCENTRACIÓN DE CARTERA ══════════════════════════════════ */
  const clientes = (c.clientes || []).filter((x) => isNum(x.ingreso) && x.ingreso > 0);
  if (clientes.length >= 3) {
    const total = sum(clientes.map((x) => x.ingreso));
    const h = hhi(clientes.map((x) => x.ingreso));
    const mayor = clientes.reduce((a, b) => (a.ingreso > b.ingreso ? a : b));
    const cuotaMayor = mayor.ingreso / total;
    const evenness = shannonEvenness(clientes.map((x) => x.ingreso));

    if (h > COMERCIAL.concentracionClientes.umbralRiesgo || cuotaMayor > COMERCIAL.concentracionClientes.umbralClienteUnico) {
      const margen = c.margenBrutoPct ?? 0.5;
      const exposicion = mayor.ingreso * margen;
      H.push(hallazgo({
        dominio: dom, tipo: 'concentracion_cartera',
        titulo: `Concentración de cartera: "${mayor.nombre}" representa el ${pct(cuotaMayor)} del ingreso`,
        descripcion:
          `El índice Herfindahl-Hirschman de la cartera es ${round(h, 4)} (umbral de alta concentración: ${COMERCIAL.concentracionClientes.umbralRiesgo}), ` +
          `con una uniformidad de Shannon de ${round(evenness, 3)} sobre 1. El cliente principal aporta ${pct(cuotaMayor)} del ingreso. ` +
          `Esto tiene dos consecuencias distintas y ambas costosas. Primera, RIESGO DE CONTINUIDAD: la pérdida de ese cliente ` +
          `eliminaría ${fmt(exposicion, moneda)} de margen anual, un evento que no es remoto sino ordinario en cualquier relación comercial. ` +
          `Segunda, y menos evidente, PÉRDIDA DE PODER DE NEGOCIACIÓN: un cliente que sabe que representa ${pct(cuotaMayor)} del ingreso ` +
          `de su proveedor negocia precio, plazo y alcance desde una posición asimétrica. La concentración no solo genera riesgo: ` +
          `ya está costando margen hoy, de forma silenciosa, en cada renegociación.`,
        metodo: 'Índice Herfindahl-Hirschman y uniformidad de Shannon sobre la distribución de ingresos por cliente',
        calculo:
          `HHI = Σ(cuotaᵢ)² = ${round(h, 5)} sobre ${clientes.length} clientes. ` +
          `Cuota del mayor = ${round(mayor.ingreso, 2)}/${round(total, 2)} = ${round(cuotaMayor, 4)}. ` +
          `Uniformidad de Shannon = H/ln(n) = ${round(evenness, 4)} (1 = distribución perfectamente uniforme). ` +
          `Exposición de margen del cliente principal = ${round(mayor.ingreso, 2)} × ${round(margen, 3)} = ${round(exposicion, 2)}. ` +
          `Umbral de referencia HHI > ${COMERCIAL.concentracionClientes.umbralRiesgo} (${COMERCIAL.concentracionClientes.fuente}).`,
        datosUsados: ['comercial.clientes[].ingreso'],
        n: clientes.length,
        nivelEvidencia: 'DETERMINISTA',
        factorISD: info.factorConfianza,
        componentesImpacto: [{
          concepto: 'Margen en riesgo por dependencia del cliente principal (valor esperado anual)',
          min: exposicion * 0.05, mode: exposicion * 0.15, max: exposicion * 0.40,
        }],
        ingresosAnuales: ingresos,
        esfuerzo: 5,
        playbook: 'diversificar_cartera',
        contexto: {
          hhi: round(h, 4), uniformidadShannon: round(evenness, 3),
          clientePrincipal: mayor.nombre, cuotaPrincipal: round(cuotaMayor, 4),
          top5: clientes.sort((a, b) => b.ingreso - a.ingreso).slice(0, 5).map((x) => ({ cliente: x.nombre, ingreso: round(x.ingreso), cuota: round(x.ingreso / total, 4) })),
        },
      }));
    }
  }

  /* ═══ 6.4 CANALES QUE DESTRUYEN MARGEN ══════════════════════════════ */
  const canales = (c.canales || []).filter((x) => isNum(x.inversion) && x.inversion > 0 && isNum(x.ingresoAtribuido));
  if (canales.length >= 2 && isNum(c.margenBrutoPct)) {
    const roasEquilibrio = 1 / c.margenBrutoPct;
    const evaluados = canales.map((x) => ({
      ...x,
      roas: x.ingresoAtribuido / x.inversion,
      contribucion: x.ingresoAtribuido * c.margenBrutoPct - x.inversion,
      cpa: isNum(x.conversiones) && x.conversiones > 0 ? x.inversion / x.conversiones : null,
    })).sort((a, b) => b.contribucion - a.contribucion);

    const negativos = evaluados.filter((x) => x.contribucion < 0);
    if (negativos.length) {
      const perdida = Math.abs(sum(negativos.map((x) => x.contribucion)));
      const mejor = evaluados[0];
      H.push(hallazgo({
        dominio: dom, tipo: 'canal_destructor_margen',
        titulo: `${negativos.length} canal(es) con contribución marginal negativa`,
        descripcion:
          `Con un margen bruto de ${pct(c.margenBrutoPct)}, el ROAS de equilibrio es ${round(roasEquilibrio, 2)}×: por debajo de ese punto, ` +
          `cada peso invertido devuelve menos de un peso de margen. Canales por debajo del equilibrio: ` +
          negativos.map((x) => `"${x.nombre}" (ROAS ${round(x.roas, 2)}×, contribución ${fmt(x.contribucion, moneda)})`).join(' · ') + '. ' +
          `Pérdida agregada: ${fmt(perdida, moneda)}. ` +
          `Reasignar esa inversión al canal de mejor contribución ("${mejor.nombre}", ROAS ${round(mejor.roas, 2)}×) generaría ` +
          `${fmt(sum(negativos.map((x) => x.inversion)) * (mejor.roas * c.margenBrutoPct - 1), moneda)} de margen adicional, ` +
          `SI el canal receptor escala linealmente. ` +
          `ADVERTENCIA CRÍTICA SOBRE ESE SUPUESTO: los canales NO escalan linealmente. Presentan rendimientos marginales ` +
          `decrecientes conforme se agota la audiencia de mayor intención. Reasignar el 100% de golpe es la forma más común ` +
          `de convertir un buen canal en uno mediocre. La reasignación debe hacerse por incrementos con medición entre cada uno. ` +
          `LIMITACIÓN ADICIONAL: la atribución por canal es una construcción, no un hecho observado. Un canal de descubrimiento ` +
          `puede mostrar ROAS bajo y aun así ser la causa de conversiones atribuidas al canal de cierre.`,
        metodo: 'Contribución marginal por canal contra el ROAS de equilibrio derivado del margen bruto',
        calculo:
          `ROAS de equilibrio = 1/margen bruto = 1/${round(c.margenBrutoPct, 4)} = ${round(roasEquilibrio, 3)}×. ` +
          `Contribución = ingreso atribuido × margen − inversión. ` +
          evaluados.map((x) => `"${x.nombre}": ${round(x.ingresoAtribuido, 0)}×${round(c.margenBrutoPct, 3)} − ${round(x.inversion, 0)} = ${round(x.contribucion, 0)} (ROAS ${round(x.roas, 2)}×${x.cpa ? `, CPA ${round(x.cpa, 0)}` : ''})`).join(' · ') + '.',
        datosUsados: ['comercial.canales[]', 'comercial.margenBrutoPct'],
        n: canales.length,
        nivelEvidencia: 'DETERMINISTA',
        factorISD: info.factorConfianza,
        componentesImpacto: [{
          concepto: 'Margen recuperable por reasignación gradual de inversión desde canales bajo equilibrio',
          min: perdida * 0.3, mode: perdida * 0.7, max: perdida * 1.1,
        }],
        ingresosAnuales: ingresos,
        esfuerzo: 2,
        playbook: 'reasignar_inversion_canal',
        accionLegal: 'cambiar_promesa_comercial',
        contexto: {
          roasEquilibrio: round(roasEquilibrio, 3),
          canales: evaluados.map((x) => ({ canal: x.nombre, inversion: round(x.inversion), ingresoAtribuido: round(x.ingresoAtribuido), roas: round(x.roas, 3), contribucion: round(x.contribucion), cpa: x.cpa ? round(x.cpa) : null, veredicto: x.contribucion >= 0 ? 'sostiene' : 'destruye margen' })),
          mejorCanal: mejor.nombre,
          protocoloReasignacion: 'Mover 25% de la inversión por ciclo, medir contribución incremental, repetir solo si la contribución marginal se mantiene positiva. Detener en cuanto el ROAS marginal toque el equilibrio.',
        },
      }));
    }
  }

  /* ═══ 6.5 ELASTICIDAD PRECIO ════════════════════════════════════════ */
  const precios = (c.preciosObservados || []).filter((x) => isNum(x.precio) && x.precio > 0 && isNum(x.volumen) && x.volumen > 0);
  const preciosDistintos = new Set(precios.map((x) => x.precio)).size;
  if (precios.length >= 4 && preciosDistintos >= 3) {
    // Regresión log-log: ln(Q) = α + ε·ln(P). El coeficiente ES la elasticidad.
    const r = linreg(precios.map((x) => Math.log(x.precio)), precios.map((x) => Math.log(x.volumen)));
    if (r.applicable && r.significant) {
      const eps = r.slope;
      const inelastica = Math.abs(eps) < 1;
      const precioActual = precios[precios.length - 1].precio;
      const volumenActual = precios[precios.length - 1].volumen;
      const ingresoActual = precioActual * volumenActual;
      // Efecto de +10% de precio: ΔQ% = ε × 10%
      const nuevoVolumen = volumenActual * Math.pow(1.10, eps);
      const nuevoIngreso = precioActual * 1.10 * nuevoVolumen;
      const deltaIngreso = nuevoIngreso - ingresoActual;

      H.push(hallazgo({
        dominio: dom, tipo: inelastica ? 'precio_subvaluado' : 'demanda_elastica',
        titulo: inelastica
          ? `Precio por debajo de su punto óptimo: demanda inelástica (ε = ${round(eps, 3)})`
          : `Demanda elástica (ε = ${round(eps, 3)}): el precio es una palanca peligrosa`,
        descripcion:
          `La regresión log-log sobre ${precios.length} observaciones con ${preciosDistintos} niveles de precio distintos estima una ` +
          `elasticidad precio de la demanda de ${round(eps, 3)} (p = ${round(r.p, 4)}, R² = ${round(r.r2, 3)}). ` +
          (inelastica
            ? `Al ser |ε| < 1, la demanda es INELÁSTICA: un aumento de precio reduce el volumen menos que proporcionalmente, ` +
              `por lo que el ingreso total CRECE. Un incremento del 10% produciría una caída de volumen del ${pct(Math.abs(1 - Math.pow(1.10, eps)))} ` +
              `y un cambio de ingreso de ${fmt(deltaIngreso, moneda)} por periodo. La empresa está capturando menos valor del que el mercado ` +
              `está dispuesto a pagar: es la fuga de margen más silenciosa y más fácil de corregir de todo este informe, porque no requiere ` +
              `inversión ni cambio operativo.`
            : `Al ser |ε| > 1, la demanda es ELÁSTICA: un aumento de precio reduce el volumen más que proporcionalmente y el ingreso total CAE. ` +
              `Un incremento del 10% produciría una caída de volumen del ${pct(Math.abs(1 - Math.pow(1.10, eps)))} y un cambio de ingreso de ` +
              `${fmt(deltaIngreso, moneda)}. En este régimen, competir por precio es una carrera hacia el margen cero: la estrategia correcta ` +
              `es diferenciar para reducir la elasticidad, no bajar el precio.`) + ' ' +
          `LIMITACIÓN OBLIGATORIA: esta estimación asume que las variaciones de precio observadas no coincidieron con cambios de ` +
          `demanda, estacionalidad, promoción o movimientos de la competencia. Sin esos controles, parte del efecto medido puede ser espurio.`,
        metodo: 'Regresión log-log ln(Q) = α + ε·ln(P); el coeficiente de la pendiente es directamente la elasticidad precio de la demanda',
        calculo:
          `ln(Q) = ${round(r.intercept, 4)} + ${round(r.slope, 4)}·ln(P). ` +
          `ε = ${round(eps, 4)} · EE(ε) = ${round(r.seSlope, 4)} · t = ${round(r.t, 3)} · p = ${round(r.p, 5)} · R² = ${round(r.r2, 4)}. ` +
          `IC 95% aproximado de ε: [${round(eps - 1.96 * r.seSlope, 3)}, ${round(eps + 1.96 * r.seSlope, 3)}]. ` +
          `Simulación +10% de precio: Q' = Q×1.10^ε = ${round(volumenActual, 1)}×${round(Math.pow(1.10, eps), 4)} = ${round(nuevoVolumen, 1)}; ` +
          `ingreso' = ${round(precioActual * 1.10, 2)}×${round(nuevoVolumen, 1)} = ${round(nuevoIngreso, 2)} vs. actual ${round(ingresoActual, 2)}.`,
        datosUsados: [`comercial.preciosObservados (n=${precios.length}, ${preciosDistintos} niveles de precio)`],
        n: precios.length, pValor: r.p,
        nivelEvidencia: 'ESTADISTICA',
        factorISD: info.factorConfianza,
        componentesImpacto: (inelastica && deltaIngreso > 0) ? [{
          concepto: 'Ingreso anual adicional por ajuste de precio del 5% al 10% en régimen inelástico',
          // Las observaciones de precio corresponden al periodo de venta declarado;
          // se anualizan con el factor del bloque comercial (por defecto, anual).
          min: (precioActual * 1.05 * volumenActual * Math.pow(1.05, eps) - ingresoActual) * factorComercial,
          mode: deltaIngreso * factorComercial * 0.75,
          max: deltaIngreso * factorComercial,
        }] : [],
        ingresosAnuales: ingresos,
        esfuerzo: 2,
        playbook: inelastica ? 'ajustar_precio' : 'diferenciar_oferta',
        accionLegal: 'modificar_precios',
        contexto: {
          elasticidad: round(eps, 4), regimen: inelastica ? 'inelástica' : 'elástica',
          r2: round(r.r2, 4), pValor: round(r.p, 5),
          ic95: [round(eps - 1.96 * r.seSlope, 3), round(eps + 1.96 * r.seSlope, 3)],
          simulacion: [5, 10, 15].map((pp) => ({
            ajustePrecio: `+${pp}%`,
            cambioVolumen: round(Math.pow(1 + pp / 100, eps) - 1, 4),
            cambioIngreso: round(((1 + pp / 100) * Math.pow(1 + pp / 100, eps)) - 1, 4),
          })),
          barreraLegal: 'El precio debe fijarse de forma unilateral e independiente. Coordinarlo con competidores constituye práctica monopólica absoluta (art. 53 LFCE), nula de pleno derecho y sancionable con hasta el 10% de los ingresos.',
        },
      }));
    }
  }

  /* ═══ 6.6 REGLA DEL 40 ══════════════════════════════════════════════ */
  if (isNum(c.crecimientoAnual) && isNum(c.margenEbitdaPct)) {
    const score = c.crecimientoAnual + c.margenEbitdaPct;
    if (score < COMERCIAL.reglaDel40.umbral) {
      H.push(hallazgo({
        dominio: dom, tipo: 'equilibrio_crecimiento_rentabilidad',
        titulo: `Regla del 40 no alcanzada: ${pct(score)} (crecimiento ${pct(c.crecimientoAnual)} + margen ${pct(c.margenEbitdaPct)})`,
        descripcion:
          `La suma de la tasa de crecimiento y el margen operativo es de ${pct(score)}, frente al umbral de referencia de ${pct(COMERCIAL.reglaDel40.umbral)}. ` +
          `La regla expresa un intercambio legítimo: una empresa puede crecer poco si es muy rentable, o ser poco rentable si crece rápido. ` +
          `Estar por debajo significa que no se está consiguiendo ninguna de las dos cosas con suficiencia — se paga el costo del crecimiento ` +
          `sin obtener su velocidad. Para alcanzar el umbral se requieren ${pct(COMERCIAL.reglaDel40.umbral - score)} adicionales, ` +
          `repartibles entre ambas palancas. ` +
          `SALVEDAD DE APLICABILIDAD: este es un marco de referencia originado en software de suscripción. Su traslado a negocios de ` +
          `capital intensivo o de margen estructuralmente bajo requiere recalibrar el umbral contra pares reales del sector.`,
        metodo: 'Regla del 40: tasa de crecimiento + margen operativo contra umbral de referencia',
        calculo:
          `Puntaje = crecimiento + margen EBITDA = ${round(c.crecimientoAnual, 4)} + ${round(c.margenEbitdaPct, 4)} = ${round(score, 4)}. ` +
          `Umbral = ${COMERCIAL.reglaDel40.umbral}. Brecha = ${round(COMERCIAL.reglaDel40.umbral - score, 4)}. ` +
          `Fuente: ${COMERCIAL.reglaDel40.fuente} (confianza: ${COMERCIAL.reglaDel40.confianza}).`,
        datosUsados: ['comercial.crecimientoAnual', 'comercial.margenEbitdaPct'],
        nivelEvidencia: 'CONVENCION',
        factorISD: info.factorConfianza,
        ingresosAnuales: ingresos,
        esfuerzo: 5,
        playbook: 'reequilibrar_crecimiento',
        contexto: { puntaje: round(score, 4), umbral: COMERCIAL.reglaDel40.umbral, brecha: round(COMERCIAL.reglaDel40.umbral - score, 4), crecimiento: round(c.crecimientoAnual, 4), margen: round(c.margenEbitdaPct, 4) },
      }));
    }
  }

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    economiaUnitaria: ltv !== null ? {
      ltv: round(ltv), cac: round(c.cac), ratio: round(ratio, 3),
      paybackMeses: round(paybackMeses, 2),
      veredicto: ratio >= COMERCIAL.ltvCac.minimoViable ? 'viable' : 'insuficiente',
    } : null,
    cobertura: { isd: info.isd, clientes: clientes.length, canales: canales.length, observacionesDePrecio: precios.length },
    marcoConceptual:
      'Primero la unidad económica, después el volumen. Escalar un modelo con LTV/CAC insuficiente multiplica la pérdida: ' +
      'en ese estado, crecer es la decisión más destructiva disponible.',
  };
}
