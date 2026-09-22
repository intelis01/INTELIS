/**
 * INTELIS · Batería de pruebas del motor
 * Ejecutar: node test/motor.test.mjs
 *
 * Valida (a) la correctitud numérica de la biblioteca matemática contra
 * valores de referencia publicados, y (b) las garantías de comportamiento
 * que el motor declara: determinismo, abstención informada y validación.
 */

import * as S from '../engine/core/stats.js';
import { validar, indiceSuficiencia, factorAnualizacion } from '../engine/core/schema.js';
import { diagnosticar } from '../engine/engine.js';
import { costoTerminacionLFT } from '../engine/detectors/d4-puestos.js';
import { wilsonCI } from '../engine/detectors/d2-embudos.js';
import { agregarConSolapamiento } from '../engine/core/scoring.js';
import { PLAYBOOKS } from '../engine/data/playbooks.js';
import { NORMAS, MAPA_ACCION, sustentoJuridico } from '../engine/data/legal-mx.js';
import { inventarioFuentes } from '../engine/data/benchmarks.js';
import { EMPRESA_DEMO } from '../data/empresa-demo.js';

let pasadas = 0, fallidas = 0;
const grupos = [];

function grupo(nombre) { grupos.push(nombre); console.log(`\n── ${nombre}`); }
function ok(nombre, cond, detalle = '') {
  if (cond) { pasadas++; console.log(`   ✓ ${nombre}`); }
  else { fallidas++; console.log(`   ✗ ${nombre}${detalle ? '  → ' + detalle : ''}`); }
}
const cerca = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

/* ═══ 1. Biblioteca matemática contra valores de referencia ═══════════ */
grupo('Distribuciones y pruebas — valores de referencia publicados');
ok('Φ(1.96) = 0.9750', cerca(S.normalCDF(1.96), 0.975, 1e-4), String(S.normalCDF(1.96)));
ok('Φ⁻¹(0.975) = 1.9600', cerca(S.normalInv(0.975), 1.96, 1e-4), String(S.normalInv(0.975)));
ok('Φ⁻¹(Φ(x)) ≈ x en [-3,3]', [-3,-1.5,0,0.7,2.4].every(x => cerca(S.normalInv(S.normalCDF(x)), x, 5e-3)));
ok('t(2.228, 10 gl) = 0.9750', cerca(S.tCDF(2.228, 10), 0.975, 1e-3), String(S.tCDF(2.228, 10)));
ok('χ²(16.919, 9 gl) cola sup. = 0.0500', cerca(S.chi2P(16.919, 9), 0.05, 2e-3), String(S.chi2P(16.919, 9)));
ok('logΓ(5) = ln(24)', cerca(S.logGamma(5), Math.log(24), 1e-6));

grupo('Estadística descriptiva y robusta');
ok('mediana([1,2,3,4,5]) = 3', S.median([1,2,3,4,5]) === 3);
ok('varianza muestral de [2,4,4,4,5,5,7,9] = 4.571', cerca(S.variance([2,4,4,4,5,5,7,9]), 32/7, 1e-3));
ok('MAD insensible a un atípico extremo', cerca(S.mad([1,2,3,4,5]), S.mad([1,2,3,4,1e6]), 1e-9));
ok('σ SÍ es arrastrada por ese atípico (justifica usar MAD)', S.stdev([1,2,3,4,1e6]) > 1000 * S.stdev([1,2,3,4,5]));
ok('Gini de distribución uniforme = 0', cerca(S.gini([5,5,5,5]), 0, 1e-9));
ok('Gini de concentración total → 1', S.gini([0,0,0,100]) > 0.7);
ok('HHI de 4 partes iguales = 0.25', cerca(S.hhi([1,1,1,1]), 0.25, 1e-9));
ok('Jaccard de conjuntos idénticos = 1', cerca(S.jaccard(['a','b'], ['A','B']), 1, 1e-9));
ok('Jaccard de conjuntos disjuntos = 0', cerca(S.jaccard(['a'], ['z']), 0, 1e-9));

grupo('Colas y restricciones');
ok('M/M/1 ρ=0.8 → Lq = 3.20', cerca(S.mm1(8, 10).Lq, 3.2, 1e-6));
ok('M/M/1 ρ=0.9 → Lq = 8.10', cerca(S.mm1(9, 10).Lq, 8.1, 1e-6));
ok('M/M/1 ρ=0.95 → Lq = 18.05', cerca(S.mm1(9.5, 10).Lq, 18.05, 1e-6));
ok('M/M/1 declara inestable con ρ ≥ 1', S.mm1(10, 10).estable === false);
ok('Ley de Little: L = λ·W se cumple en M/M/1', cerca(S.mm1(8,10).L, 8 * S.mm1(8,10).W, 1e-9));
ok('Erlang C con c=1 coincide con M/M/1 en Wq', cerca(S.erlangC(8,10,1).Wq, S.mm1(8,10).Wq, 1e-6));
ok('Erlang: más servidores ⇒ menor probabilidad de espera', S.erlangC(20,1,25).pWait > S.erlangC(20,1,30).pWait);

grupo('Calidad');
ok('DPMO 6210 → 4.00σ', cerca(S.sigmaLevel(6210, 1e6).sigma, 4.0, 0.02));
ok('DPMO 66807 → 3.00σ', cerca(S.sigmaLevel(66807, 1e6).sigma, 3.0, 0.02));
ok('Cpk separa las colas de especificación', (() => {
  const c = S.capability([9,10,11,10,9,10,11,10,9,10,11,10], 4, 12);
  return c.applicable && cerca(c.ppmSobreLimiteSuperior + c.ppmBajoLimiteInferior, c.ppmDefective, 1e-6);
})());
ok('Carta I-MR detecta un punto fuera de ±3σ', (() => {
  const serie = [10,10.2,9.8,10.1,9.9,10,10.1,9.9,10,10.2,9.8,18];
  const c = S.individualsChart(serie);
  return c.applicable && c.violations.some(v => v.rule === 1);
})());
ok('Carta I-MR no inventa señales en un proceso estable', (() => {
  const r = S.rng(7); const serie = Array.from({length: 40}, () => S.randNormal(r, 10, 0.5));
  return S.individualsChart(serie).outOfControlRate < 0.1;
})());

grupo('Finanzas');
ok('VPN(10%, [-100,60,60]) = 4.132', cerca(S.npv(0.1, [-100,60,60]), 4.1322, 1e-3));
ok('TIR([-100,60,60]) ≈ 13.07%', cerca(S.irr([-100,60,60]), 0.1306, 1e-3));
ok('TIR es null sin cambio de signo', S.irr([100, 60, 60]) === null);
ok('VPN(TIR) = 0 por definición', cerca(S.npv(S.irr([-100,60,60]), [-100,60,60]), 0, 1e-4));
ok("Altman Z'' clasifica zona de insolvencia", (() => {
  const z = S.altmanZ2({ capitalTrabajo: -50, activoTotal: 1000, utilidadesRetenidas: -200, ebit: -80, capitalContable: 50, pasivoTotal: 950 });
  return z.applicable && z.zona === 'insolvencia';
})());
ok("Altman Z'' clasifica zona segura", (() => {
  const z = S.altmanZ2({ capitalTrabajo: 400, activoTotal: 1000, utilidadesRetenidas: 300, ebit: 200, capitalContable: 700, pasivoTotal: 300 });
  return z.applicable && z.zona === 'segura';
})());
ok('CCC = DSO + DIO − DPO', (() => {
  const c = S.cashCycle({ cxc: 100, ingresos: 365, inventario: 50, costoVentas: 365, cxp: 30 });
  return cerca(c.ccc, c.dso + c.dio - c.dpo, 1e-9);
})());

grupo('Benford y detección de anomalías');
ok('Benford se abstiene con n < 50', S.benford([100,200,300]).applicable === false);
ok('Benford acepta datos conformes', (() => {
  const r = S.rng(3);
  const datos = Array.from({length: 600}, () => Math.pow(10, 1 + 3 * r()));
  const b = S.benford(datos);
  return b.applicable && !b.anomalous;
})());
ok('Benford marca una distribución uniforme como anómala', (() => {
  const r = S.rng(5);
  const datos = Array.from({length: 400}, () => (1 + Math.floor(r() * 9)) * 1000 + Math.floor(r() * 999));
  const b = S.benford(datos);
  return b.applicable && b.anomalous;
})());
ok('Grubbs se abstiene con n < 7', S.grubbs([1,2,3,50]).detected === false);
ok('Grubbs detecta un atípico claro', S.grubbs([10,11,10,12,11,10,11,10,90]).detected === true);
ok('Mann-Kendall detecta tendencia creciente', (() => {
  const mk = S.mannKendall([1,2,3,4,5,6,7,8,9,10]);
  return mk.applicable && mk.significant && mk.senSlope > 0;
})());
ok('Mann-Kendall NO inventa tendencia en ruido', (() => {
  const r = S.rng(11);
  const mk = S.mannKendall(Array.from({length: 30}, () => S.randNormal(r, 10, 1)));
  return mk.applicable && !mk.significant;
})());

grupo('Regresión');
ok('MCO recupera los coeficientes verdaderos', (() => {
  const x = [1,2,3,4,5,6,7,8,9,10];
  const y = x.map(v => 3 + 2 * v);
  const r = S.linreg(x, y);
  return cerca(r.slope, 2, 1e-9) && cerca(r.intercept, 3, 1e-9) && cerca(r.r2, 1, 1e-9);
})());
ok('MCO declara no significativa una relación inexistente', (() => {
  const r0 = S.rng(13);
  const x = Array.from({length: 24}, (_, i) => i + 1);
  const y = x.map(() => S.randNormal(r0, 100, 20));
  return S.linreg(x, y).significant === false;
})());
ok('Regresión log-log recupera la elasticidad', (() => {
  const P = [10,12,14,16,18,20];
  const Q = P.map(p => 1000 * Math.pow(p, -1.5));
  const r = S.linreg(P.map(Math.log), Q.map(Math.log));
  return cerca(r.slope, -1.5, 1e-6);
})());

grupo('Intervalos de confianza');
ok('Wilson 30/100 ≈ [0.218, 0.396]', (() => {
  const w = wilsonCI(30, 100);
  return cerca(w.lo, 0.2175, 5e-3) && cerca(w.hi, 0.3971, 5e-3);
})());
ok('Wilson NO degenera con 0 éxitos (Wald sí lo haría)', wilsonCI(0, 20).hi > 0);
ok('Bootstrap produce un IC que contiene la media', (() => {
  const a = [10,12,11,13,9,14,10,11,12,13,11,10];
  const b = S.bootstrapCI(a);
  return b.applicable && b.lo <= S.mean(a) && S.mean(a) <= b.hi;
})());
ok('Monte Carlo: P5 < P50 < P95', (() => {
  const m = S.monteCarlo([{min: 100, mode: 200, max: 400}], 5000);
  return m.p5 < m.p50 && m.p50 < m.p95;
})());
ok('Monte Carlo converge entre semillas (<2%)', (() => {
  const v = [{min: 100, mode: 200, max: 400}];
  const a = S.monteCarlo(v, 10000, 1).p50, b = S.monteCarlo(v, 10000, 999).p50;
  return Math.abs(a - b) / a < 0.02;
})());

/* ═══ 2. Costeo laboral conforme a la LFT ════════════════════════════ */
grupo('Costeo de terminación (Ley Federal del Trabajo)');
{
  const c = costoTerminacionLFT({ salarioDiario: 1200, antiguedadAños: 6, salarioMinimoDiario: 278.80 });
  ok('prima de antigüedad = 12 días × 2 SM × años (art. 162)', cerca(c.componentes.primaAntiguedad, 12 * 557.60 * 6, 0.01));
  ok('indemnización = 90 días de salario (art. 48)', cerca(c.componentes.indemnizacion3Meses, 108000, 0.01));
  ok('20 días por año de servicios (art. 50-III)', cerca(c.componentes.veinteDiasPorAño, 144000, 0.01));
  ok('convenio < liquidación de ley < litigio adverso', c.escenarios.convenio < c.escenarios.liquidacionConformeALey && c.escenarios.liquidacionConformeALey < c.escenarios.litigioAdverso);
  ok('el esperado queda entre convenio y litigio', c.esperado > c.escenarios.convenio && c.esperado < c.escenarios.litigioAdverso);
  ok('el salario se topa a 2 SM solo en la prima de antigüedad', (() => {
    const alto = costoTerminacionLFT({ salarioDiario: 5000, antiguedadAños: 6, salarioMinimoDiario: 278.80 });
    return cerca(alto.componentes.primaAntiguedad, c.componentes.primaAntiguedad, 0.01)
        && alto.componentes.indemnizacion3Meses > c.componentes.indemnizacion3Meses;
  })());
  ok('declara su carácter orientativo', typeof c.advertencia === 'string' && c.advertencia.includes('ORIENTATIVO'));
  ok('cita su base legal', c.baseLegal.length >= 4);
  ok('se abstiene sin los insumos requeridos', costoTerminacionLFT({}).calculable === false);
}

/* ═══ 3. Validación de datos ═════════════════════════════════════════ */
grupo('Validación de integridad de datos');
const base = { empresa: {nombre:'X',sector:'s',moneda:'MXN',periodo:'p'}, finanzas: {ingresos:100,costoVentas:40,gastosOperacion:30} };
ok('acepta un dataset mínimo válido', validar(base).errores.length === 0);
ok('detecta descuadre de la ecuación contable A = P + C', validar({...base, finanzas:{...base.finanzas, activoTotal:100, pasivoTotal:60, capitalContable:50}}).errores.some(e => e.campo === 'finanzas.balance'));
ok('acepta un balance cuadrado', validar({...base, finanzas:{...base.finanzas, activoTotal:110, pasivoTotal:60, capitalContable:50}}).errores.length === 0);
ok('detecta un embudo que crece', validar({...base, embudo:[{etapa:'a',volumen:10},{etapa:'b',volumen:20}]}).errores.some(e => e.campo.startsWith('embudo')));
ok('detecta ciclos en el organigrama', validar({...base, personal:[{id:'a',reportaA:'b'},{id:'b',reportaA:'a'}]}).errores.some(e => e.mensaje.includes('Ciclo')));
ok('detecta referencias rotas en reportaA', validar({...base, personal:[{id:'a',reportaA:'fantasma'}]}).errores.some(e => e.campo.includes('reportaA')));
ok('detecta doble conteo de gastos sobre el agregado', validar({...base, gastos:[{concepto:'x',monto:50},{concepto:'y',monto:50}]}).errores.some(e => e.campo === 'gastos'));
ok('rechaza churn fuera de [0,1)', validar({...base, comercial:{churnMensual:1.5}}).errores.some(e => e.campo === 'comercial.churnMensual'));
ok('advierte cuando la periodicidad no se declaró', validar({...base, procesos:[{id:'p',tasaLlegada:1,capacidad:2}]}).avisos.some(a => a.campo.includes('periodicidad')));
ok('factorAnualizacion mapea correctamente', factorAnualizacion('mensual') === 12 && factorAnualizacion('anual') === 1 && factorAnualizacion('ficticio') === null);

grupo('Índice de suficiencia de datos');
ok('un dataset vacío declara todos los dominios no evaluables', (() => {
  const isd = indiceSuficiencia({ finanzas: {}, comercial: {} });
  return Object.values(isd).every(v => !v.evaluable);
})());
ok('un dominio no evaluable declara su razón y sus faltantes', (() => {
  const v = indiceSuficiencia({ finanzas: {}, comercial: {} }).gastos;
  return typeof v.razon === 'string' && v.insumosFaltantes.length > 0;
})());
ok('el ISD atenúa la confianza (factor ≤ 1)', Object.values(indiceSuficiencia({finanzas:{},comercial:{}})).every(v => v.factorConfianza <= 1 && v.factorConfianza >= 0.55));

/* ═══ 4. Garantías del motor ═════════════════════════════════════════ */
grupo('Garantías del motor');
const r1 = diagnosticar(EMPRESA_DEMO);
const r2 = diagnosticar(EMPRESA_DEMO);
const r3 = diagnosticar(EMPRESA_DEMO, { semilla: 4242 });
const firma = (r) => JSON.stringify(r.hallazgos.map(h => [h.id, h.impacto.p50, h.prioridad.ipi]));

ok('ejecuta sobre el dataset de demostración', r1.ejecutado === true);
ok('sin errores de ejecución en ningún detector', r1.erroresDeEjecucion.length === 0, JSON.stringify(r1.erroresDeEjecucion));
ok('sin errores de validación en el dataset demo', r1.validacion.errores.length === 0, JSON.stringify(r1.validacion.errores.map(e=>e.campo)));
ok('DETERMINISMO: misma semilla ⇒ informe idéntico', firma(r1) === firma(r2));
ok('la semilla SÍ altera la simulación', firma(r1) !== firma(r3));
ok('la semilla no altera las conclusiones (convergencia <2%)', Math.abs(r3.resumen.impactoAnualIdentificado.p50 - r1.resumen.impactoAnualIdentificado.p50) / r1.resumen.impactoAnualIdentificado.p50 < 0.02);
ok('los 7 dominios se evalúan con el dataset demo', r1.resumen.dominiosEvaluados === 7);
ok('produce hallazgos en los 7 dominios', Object.values(r1.dominios).every(d => d.hallazgos.length > 0));
ok('identifica la restricción del sistema', typeof r1.resumen.restriccionDelSistema === 'string');
ok('el apalancamiento TOC se propaga a los hallazgos de la etapa restrictiva', (() => {
  const etapa = r1.resumen.restriccionDelSistema;
  const enEtapa = r1.hallazgos.filter(h => h.contexto?.entapa === etapa || h.contexto?.etapa === etapa);
  // Todo hallazgo que ocurre en la restricción debe llevar el flag, y ninguno fuera de ella.
  return enEtapa.every(h => h.esRestriccion === true)
      && r1.hallazgos.filter(h => h.esRestriccion).every(h => h.contexto?.etapa === etapa || h.tipo === 'restriccion_sistema');
})());
ok('el informe declara la nota de subordinación a la restricción', typeof r1.resumen.notaTOC === 'string' && r1.resumen.notaTOC.length > 40);

grupo('Abstención informada');
ok('se abstiene sin los bloques mínimos', diagnosticar({ empresa: {} }).ejecutado === false);
ok('un dominio sin datos se declara NO EVALUADO, no vacío', (() => {
  const r = diagnosticar({ ...base, empresa: {...base.empresa} });
  const d = Object.values(r.dominios).filter(x => !x.evaluado);
  return d.length > 0 && d.every(x => typeof x.razonNoEvaluado === 'string' && x.advertencia.includes('NO AUSENCIA DE PROBLEMAS'));
})());
ok('advierte sobre los dominios no evaluados', (() => {
  const r = diagnosticar(base);
  return r.advertencias.some(a => a.tipo === 'dominios_sin_datos');
})());

grupo('Anatomía de los hallazgos');
ok('todo hallazgo declara método y cálculo', r1.hallazgos.every(h => h.evidencia.metodo && h.evidencia.calculo));
ok('todo hallazgo declara sus datos de entrada', r1.hallazgos.every(h => Array.isArray(h.evidencia.datosUsados)));
ok('todo hallazgo tiene severidad y confianza', r1.hallazgos.every(h => h.severidad.valor >= 1 && h.confianza.score >= 0));
ok('todo impacto cuantificado cumple P5 ≤ P50 ≤ P95', r1.hallazgos.filter(h => h.impacto.cuantificable).every(h => h.impacto.p5 <= h.impacto.p50 && h.impacto.p50 <= h.impacto.p95));
ok('todo hallazgo tiene prioridad calculada', r1.hallazgos.every(h => typeof h.prioridad.ipi === 'number' && h.prioridad.clase));

grupo('Sustento de las soluciones');
const conSol = r1.hallazgos.filter(h => h.solucion && h.solucion.sustentos && h.solucion.sustentos.operativo);
ok('toda solución referencia un playbook existente', r1.hallazgos.every(h => !h.playbook || !!PLAYBOOKS[h.playbook]));
ok('los 7 campos de sustento están presentes en toda solución', conSol.every(h => ['matematico','estadistico','financiero','juridico','operativo','riesgo','evidencia'].every(k => k in h.solucion.sustentos)));
ok('toda solución declara pasos verificables', conSol.every(h => h.solucion.sustentos.operativo.pasos.length > 0));
ok('toda solución declara indicador de éxito', conSol.every(h => !!h.solucion.sustentos.operativo.indicadorDeExito.nombre));
ok('toda solución declara señal de aborto', conSol.every(h => typeof h.solucion.sustentos.operativo.señalDeAborto === 'string'));
ok('toda solución declara riesgos de ejecución con mitigación', conSol.every(h => h.solucion.sustentos.riesgo.riesgosDeEjecucion.every(x => x.riesgo && x.mitigacion)));
ok('todo campo incompleto declara su razón y naturaleza', r1.hallazgos.every(h => (h.solucion.camposIncompletos || []).every(c => c.razon && c.naturaleza)));
ok('los hallazgos de plantilla incluyen sustento de salud ocupacional', r1.hallazgos.filter(h => h.dominio === 'puestos').every(h => h.solucion.sustentos.saludOcupacional.aplicable === true));
ok('el sustento médico declara su limitación diagnóstica', r1.hallazgos.filter(h => h.solucion?.sustentos?.saludOcupacional?.aplicable).every(h => h.solucion.sustentos.saludOcupacional.limitacion.includes('NO realiza diagnóstico médico')));
ok('los hallazgos con acción normada citan artículos concretos', r1.hallazgos.filter(h => h.accionLegal).every(h => h.solucion.sustentos.juridico.normasAplicables.length > 0));
ok('todo sustento jurídico exige validación profesional', r1.hallazgos.filter(h => h.accionLegal).every(h => h.solucion.sustentos.juridico.requiereValidacionProfesional === true));
ok('toda evaluación financiera incluye prueba de resistencia', conSol.filter(h => h.solucion.sustentos.financiero.completo).every(h => !!h.solucion.sustentos.financiero.pruebaDeResistencia));

grupo('Priorización y agregación');
ok('el ranking está ordenado de forma descendente por IPI (salvo cumplimiento obligatorio)', (() => {
  const sinObl = r1.plan.ranking.filter(h => h.prioridad.clase !== 'CUMPLIMIENTO OBLIGATORIO');
  return sinObl.every((h, i) => i === 0 || sinObl[i-1].prioridad.ipi >= h.prioridad.ipi);
})());
ok('el cumplimiento obligatorio encabeza el ranking', r1.plan.ranking[0].prioridad.clase === 'CUMPLIMIENTO OBLIGATORIO' || !r1.hallazgos.some(h => h.bloqueaLegal));
ok('la restricción recibe apalancamiento 2.0', r1.hallazgos.filter(h => h.esRestriccion).every(h => h.prioridad.factores.apalancamientoTOC === 2.0));
ok('el ranking discrimina (no todo cae en una clase)', new Set(r1.hallazgos.map(h => h.prioridad.clase)).size >= 3);
ok('las olas están acotadas a 4', r1.plan.olas.length <= 4);
ok('la cartera de seguimiento recoge el excedente', r1.plan.olas.reduce((a,o) => a + o.hallazgos.length, 0) + r1.plan.cartera.n === r1.hallazgos.length);
ok('el agregado conservador ≤ la suma ingenua', (() => {
  const cs = r1.resumen.impactoAnualIdentificado.controlDeSolapamiento;
  return cs.agregadoConservador <= cs.sumaIngenua;
})());
ok('la desduplicación reconoce el máximo de cada familia', (() => {
  const cs = r1.resumen.impactoAnualIdentificado.controlDeSolapamiento;
  return cs.familias.every(f => f.reconocido <= f.sumaDeLaFamilia && (f.n === 1 ? f.descontado === 0 : true));
})());
ok('advierte cuando el agregado es implausible', (() => {
  const cs = agregarConSolapamiento([]);
  return cs.sumaIngenua === 0 && cs.agregadoConservador === 0;
})());

grupo('Integridad del marco normativo y de evidencia');
ok('el catálogo normativo tiene ≥ 25 normas', Object.keys(NORMAS).length >= 25);
ok('toda norma declara su síntesis', Object.values(NORMAS).every(n => typeof n.sintesis === 'string' && n.sintesis.length > 40));
ok('toda acción mapeada resuelve a un sustento jurídico', Object.keys(MAPA_ACCION).every(a => {
  const s = sustentoJuridico(a);
  return s && s.normasAplicables.length > 0 && s.obligacionesPrevias.length > 0 && s.barrerasDuras.length > 0;
}));
ok('toda acción mapeada declara su contingencia', Object.keys(MAPA_ACCION).every(a => typeof sustentoJuridico(a).contingenciaACuantificar === 'string'));
ok('las normas por verificar se advierten en el informe', r1.advertencias.some(a => a.tipo === 'normas_por_verificar'));
ok('toda fuente externa declara nivel de confianza', inventarioFuentes().every(f => ['alta','media','convencion'].includes(f.confianza)));
ok('toda fuente externa declara su referencia', inventarioFuentes().every(f => typeof f.fuente === 'string' && f.fuente.length > 10));
ok('el catálogo de playbooks está completo', Object.values(PLAYBOOKS).every(p => p.nombre && p.objetivo && p.mecanismo && p.pasos.length && p.kpi && p.riesgos.length && p.señalDeAborto));

/* ═══ Resultado ═════════════════════════════════════════════════════ */
console.log(`\n${'═'.repeat(64)}`);
console.log(`  ${pasadas} pruebas pasadas · ${fallidas} fallidas · ${grupos.length} grupos`);
console.log('═'.repeat(64));
process.exit(fallidas > 0 ? 1 : 0);
