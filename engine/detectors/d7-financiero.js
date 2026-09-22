/**
 * DETECTOR 7 · SOLVENCIA, LIQUIDEZ Y SEÑALES FORENSES
 * ─────────────────────────────────────────────────────────────────────────────
 * Pregunta que responde: ¿la empresa tiene tiempo para ejecutar las soluciones
 * que este informe propone?
 *
 * Este detector condiciona a todos los demás. Una organización con seis meses de
 * liquidez no puede ejecutar un rediseño estructural de dieciocho meses: la
 * secuencia de soluciones debe subordinarse a la restricción de caja.
 *
 * Métodos: Altman Z''-score · ciclo de conversión de efectivo · runway ·
 * cobertura de intereses · razones de liquidez.
 */

import { altmanZ2, cashCycle, round, isNum } from '../core/stats.js';
import { FINANCIERO } from '../data/benchmarks.js';
import { hallazgo, noEvaluable, fmt, pct } from './_base.js';

export function detectarFinanciero(d, isd) {
  const dom = 'financiero';
  const info = isd[dom] || {};
  if (!info.evaluable) return noEvaluable(dom, info.razon, info.insumosFaltantes);

  const f = d.finanzas || {};
  const ingresos = f.ingresos;
  const moneda = d.empresa?.moneda || 'MXN';
  const H = [];

  /* ═══ 7.1 RIESGO DE INSOLVENCIA ═════════════════════════════════════ */
  if (isNum(f.activoTotal) && isNum(f.pasivoTotal) && isNum(f.capitalContable) && isNum(f.capitalTrabajo) && isNum(f.ebit)) {
    const z = altmanZ2({
      capitalTrabajo: f.capitalTrabajo, activoTotal: f.activoTotal,
      utilidadesRetenidas: f.utilidadesRetenidas ?? 0, ebit: f.ebit,
      capitalContable: f.capitalContable, pasivoTotal: f.pasivoTotal,
    });
    if (z.applicable && z.zona !== 'segura') {
      H.push(hallazgo({
        dominio: dom, tipo: 'riesgo_insolvencia',
        titulo: `Riesgo de insolvencia: Z'' = ${round(z.Z, 3)} — zona ${z.zona}`,
        descripcion:
          `El modelo de Altman para empresas privadas de mercados emergentes ubica a la organización en la zona ${z.zona.toUpperCase()} ` +
          `(segura por encima de ${FINANCIERO.altman.zonaSegura}; insolvencia por debajo de ${FINANCIERO.altman.zonaInsolvencia}). ` +
          `Descomposición: capital de trabajo/activo = ${round(z.X1, 4)} · utilidades retenidas/activo = ${round(z.X2, 4)} · ` +
          `EBIT/activo = ${round(z.X3, 4)} · capital/pasivo = ${round(z.X4, 4)}. ` +
          `EFECTO SOBRE TODO ESTE INFORME: este resultado impone una restricción de secuencia. Las soluciones de retorno ` +
          `rápido y baja inversión deben ejecutarse primero; las transformaciones estructurales de horizonte largo deben ` +
          `posponerse hasta que la posición financiera lo permita. Un diagnóstico correcto ejecutado en el orden equivocado ` +
          `puede consumir la caja que se necesitaba para sobrevivir a la ejecución.`,
        metodo: `Modelo ${z.modelo}`,
        calculo:
          `Z'' = 6.56·X₁ + 3.26·X₂ + 6.72·X₃ + 1.05·X₄ = ` +
          `6.56×${round(z.X1, 4)} + 3.26×${round(z.X2, 4)} + 6.72×${round(z.X3, 4)} + 1.05×${round(z.X4, 4)} = ${round(z.Z, 4)}. ` +
          `Zonas: >${FINANCIERO.altman.zonaSegura} segura; ${FINANCIERO.altman.zonaInsolvencia}–${FINANCIERO.altman.zonaSegura} gris; <${FINANCIERO.altman.zonaInsolvencia} insolvencia. ` +
          `Fuente: ${FINANCIERO.altman.fuente}. ${FINANCIERO.altman.nota}`,
        datosUsados: ['finanzas.{capitalTrabajo, activoTotal, utilidadesRetenidas, ebit, capitalContable, pasivoTotal}'],
        nivelEvidencia: 'MODELO',
        factorISD: info.factorConfianza,
        ingresosAnuales: ingresos,
        esfuerzo: 5,
        playbook: 'estabilizar_solvencia',
        contexto: { Z: round(z.Z, 4), zona: z.zona, X1: round(z.X1, 4), X2: round(z.X2, 4), X3: round(z.X3, 4), X4: round(z.X4, 4), modelo: z.modelo },
      }));
    }
  }

  /* ═══ 7.2 RUNWAY ════════════════════════════════════════════════════ */
  if (isNum(f.efectivo) && isNum(f.quemaMensualNeta) && f.quemaMensualNeta < 0) {
    const meses = f.efectivo / Math.abs(f.quemaMensualNeta);
    if (meses < FINANCIERO.runwayMinimo.mesesSano) {
      H.push(hallazgo({
        dominio: dom, tipo: 'runway_insuficiente',
        titulo: `Horizonte de liquidez: ${round(meses, 1)} meses`,
        descripcion:
          `Con ${fmt(f.efectivo, moneda)} en caja y una quema neta de ${fmt(Math.abs(f.quemaMensualNeta), moneda)} mensuales, ` +
          `el horizonte de operación financiable es de ${round(meses, 1)} meses` +
          (meses < FINANCIERO.runwayMinimo.mesesCritico
            ? ` — por debajo del umbral crítico de ${FINANCIERO.runwayMinimo.mesesCritico} meses. Toda decisión de este informe queda subordinada a la generación de caja.`
            : ` — por debajo del horizonte sano de ${FINANCIERO.runwayMinimo.mesesSano} meses.`) +
          ` Para alcanzar ${FINANCIERO.runwayMinimo.mesesSano} meses se requiere reducir la quema mensual en ` +
          `${fmt(Math.abs(f.quemaMensualNeta) - f.efectivo / FINANCIERO.runwayMinimo.mesesSano, moneda)} o incrementar la caja en ` +
          `${fmt(Math.abs(f.quemaMensualNeta) * FINANCIERO.runwayMinimo.mesesSano - f.efectivo, moneda)}.`,
        metodo: 'Cálculo de horizonte de liquidez a tasa de quema constante',
        calculo:
          `Runway = efectivo / |quema mensual neta| = ${round(f.efectivo, 2)} / ${round(Math.abs(f.quemaMensualNeta), 2)} = ${round(meses, 2)} meses. ` +
          `SUPUESTO CRÍTICO: quema constante. Si la quema crece, el horizonte real es MENOR que el calculado. ` +
          `Este número debe recalcularse mensualmente, no anualmente.`,
        datosUsados: ['finanzas.efectivo', 'finanzas.quemaMensualNeta'],
        nivelEvidencia: 'DETERMINISTA',
        factorISD: info.factorConfianza,
        ingresosAnuales: ingresos,
        bloqueaLegal: false,
        esfuerzo: 2,
        playbook: 'extender_runway',
        contexto: { mesesRunway: round(meses, 2), efectivo: round(f.efectivo), quemaMensual: round(Math.abs(f.quemaMensualNeta)), umbralCritico: FINANCIERO.runwayMinimo.mesesCritico },
      }));
    }
  }

  /* ═══ 7.3 CAPITAL ATRAPADO EN EL CICLO DE EFECTIVO ══════════════════ */
  if (isNum(f.cuentasPorCobrar) && isNum(ingresos) && ingresos > 0) {
    const cc = cashCycle({
      cxc: f.cuentasPorCobrar, ingresos,
      inventario: f.inventario ?? 0, costoVentas: f.costoVentas,
      cxp: f.cuentasPorPagar ?? 0,
    });
    if (isNum(cc.ccc) && cc.ccc > 45) {
      const liberablePor10Dias = (10 / 365) * ingresos;
      H.push(hallazgo({
        dominio: dom, tipo: 'ciclo_efectivo_extenso',
        titulo: `Ciclo de conversión de efectivo de ${round(cc.ccc, 1)} días`,
        descripcion:
          `Transcurren ${round(cc.ccc, 1)} días entre el desembolso por insumos y la cobranza al cliente. ` +
          `Composición: ${round(cc.dso, 1)} días de cobranza (DSO) + ${round(cc.dio, 1)} días de inventario (DIO) − ${round(cc.dpo, 1)} días de pago a proveedores (DPO). ` +
          `Capital de trabajo inmovilizado: ${fmt(cc.capitalAtrapado, moneda)}. ` +
          `Cada 10 días de reducción del ciclo liberan ${fmt(liberablePor10Dias, moneda)} de caja — financiamiento interno sin costo, ` +
          `sin dilución y sin negociación bancaria. El componente dominante es ` +
          `${cc.dso >= cc.dio ? `la cobranza (DSO = ${round(cc.dso, 1)} días)` : `el inventario (DIO = ${round(cc.dio, 1)} días)`}, ` +
          `que es donde debe concentrarse la intervención.`,
        metodo: 'Ciclo de conversión de efectivo: CCC = DSO + DIO − DPO',
        calculo:
          `DSO = (CxC/ingresos)×365 = (${round(f.cuentasPorCobrar, 2)}/${round(ingresos, 2)})×365 = ${round(cc.dso, 2)} días. ` +
          `DIO = (inventario/costo de ventas)×365 = ${round(cc.dio, 2)} días. ` +
          `DPO = (CxP/costo de ventas)×365 = ${round(cc.dpo, 2)} días. ` +
          `CCC = ${round(cc.dso, 2)} + ${round(cc.dio, 2)} − ${round(cc.dpo, 2)} = ${round(cc.ccc, 2)} días. ` +
          `Capital atrapado = (CCC/365)×ingresos = ${round(cc.capitalAtrapado, 2)}.`,
        datosUsados: ['finanzas.{cuentasPorCobrar, inventario, cuentasPorPagar, ingresos, costoVentas}'],
        nivelEvidencia: 'DETERMINISTA',
        factorISD: info.factorConfianza,
        componentesImpacto: [{
          concepto: 'Caja liberable por reducción del ciclo (escenario de 5 a 20 días)',
          min: (5 / 365) * ingresos, mode: (10 / 365) * ingresos, max: (20 / 365) * ingresos,
        }],
        ingresosAnuales: ingresos,
        esfuerzo: 2,
        playbook: 'acelerar_ciclo_efectivo',
        contexto: { ccc: round(cc.ccc, 1), dso: round(cc.dso, 1), dio: round(cc.dio, 1), dpo: round(cc.dpo, 1), capitalAtrapado: round(cc.capitalAtrapado), componenteDominante: cc.dso >= cc.dio ? 'cobranza' : 'inventario' },
      }));
    }
  }

  /* ═══ 7.4 COBERTURA DE INTERESES ════════════════════════════════════ */
  if (isNum(f.coberturaIntereses) && f.coberturaIntereses < FINANCIERO.liquidez.coberturaInteresesMinima) {
    H.push(hallazgo({
      dominio: dom, tipo: 'cobertura_intereses_baja',
      titulo: `Cobertura de intereses de ${round(f.coberturaIntereses, 2)}×`,
      descripcion:
        `La utilidad operativa cubre ${round(f.coberturaIntereses, 2)} veces el servicio de intereses, por debajo del mínimo ` +
        `convencional de ${FINANCIERO.liquidez.coberturaInteresesMinima}× ` +
        (f.coberturaIntereses < FINANCIERO.liquidez.coberturaInteresesCritica
          ? `y por debajo del umbral crítico de ${FINANCIERO.liquidez.coberturaInteresesCritica}× que suele activar cláusulas restrictivas en convenios de crédito. `
          : '. ') +
        `Con este margen, una caída del ${pct(1 - 1 / Math.max(1.01, f.coberturaIntereses))} en la utilidad operativa dejaría a la empresa ` +
        `sin capacidad de cubrir sus intereses con la operación. Verificar los covenants vigentes antes de cualquier decisión ` +
        `que comprima temporalmente el EBIT, incluidas las inversiones de mejora que propone este informe.`,
      metodo: 'Razón de cobertura de intereses (EBIT / gastos financieros) contra umbrales de análisis crediticio',
      calculo:
        `Cobertura = EBIT/gastos financieros = ${round(f.ebit, 2)}/${round(f.gastosFinancieros, 2)} = ${round(f.coberturaIntereses, 3)}×. ` +
        `Margen de caída tolerable del EBIT = 1 − 1/cobertura = ${round(1 - 1 / Math.max(1.01, f.coberturaIntereses), 4)}.`,
      datosUsados: ['finanzas.ebit', 'finanzas.gastosFinancieros'],
      nivelEvidencia: 'DETERMINISTA',
      factorISD: info.factorConfianza,
      ingresosAnuales: ingresos,
      esfuerzo: 3,
      playbook: 'reestructurar_deuda',
      contexto: { cobertura: round(f.coberturaIntereses, 3), umbralMinimo: FINANCIERO.liquidez.coberturaInteresesMinima, margenCaidaTolerable: round(1 - 1 / Math.max(1.01, f.coberturaIntereses), 4) },
    }));
  }

  return {
    dominio: dom, evaluado: true, hallazgos: H,
    cobertura: { isd: info.isd },
    indicadores: {
      margenBruto: isNum(f.margenBruto) ? round(f.margenBruto, 4) : null,
      margenOperativo: isNum(f.margenOperativo) ? round(f.margenOperativo, 4) : null,
      razonCorriente: isNum(f.razonCorriente) ? round(f.razonCorriente, 3) : null,
      pruebaAcida: isNum(f.pruebaAcida) ? round(f.pruebaAcida, 3) : null,
      coberturaIntereses: isNum(f.coberturaIntereses) ? round(f.coberturaIntereses, 3) : null,
      capitalTrabajo: isNum(f.capitalTrabajo) ? round(f.capitalTrabajo) : null,
    },
    marcoConceptual:
      'La posición financiera no es un dominio más: es la restricción temporal que ordena la ejecución de todos los demás. ' +
      'Determina cuánto tiempo tiene la organización para capturar el valor que el resto del informe identifica.',
  };
}
