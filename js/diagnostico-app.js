/**
 * INTELIS · Interfaz del Motor de Diagnóstico Organizacional
 * Renderiza el informe completo, incluidos los siete campos de sustento de
 * cada solución. Todo el cómputo ocurre en el navegador: los datos financieros
 * del usuario nunca salen de su equipo.
 */

import { diagnosticar, VERSION } from '../engine/engine.js';
import { EMPRESA_DEMO } from '../data/empresa-demo.js';

/* ── Utilidades de presentación ─────────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let MONEDA = 'MXN';
const money = (n) => (typeof n === 'number' && isFinite(n))
  ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: MONEDA, maximumFractionDigits: 0 }).format(n)
  : '—';
const pctf = (n, d = 1) => (typeof n === 'number' && isFinite(n)) ? `${(n * 100).toFixed(d)}%` : '—';
const num  = (n, d = 2) => (typeof n === 'number' && isFinite(n)) ? n.toLocaleString('es-MX', { maximumFractionDigits: d }) : '—';

const chipClase = (c) => ({
  'CUMPLIMIENTO OBLIGATORIO': 'obligatorio', 'CRÍTICA': 'critica',
  'ALTA': 'alta', 'MEDIA': 'media', 'BAJA': 'baja',
}[c] || 'baja');

/* ── Bloques de sustento ────────────────────────────────────────────── */

function bloque(n, titulo, contenidoHTML, falta = false) {
  return `<div class="mdo-sustento${falta ? ' mdo-sustento--falta' : ''}">
    <div class="mdo-sustento__head"><span class="n">${n}</span>${esc(titulo)}</div>
    ${contenidoHTML}
  </div>`;
}

function kv(pairs) {
  const rows = pairs.filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('');
  return rows ? `<dl class="mdo-kv">${rows}</dl>` : '';
}

function sustentoMatematico(s) {
  const c = s.cuantificacionDelImpacto;
  let impacto = '';
  if (c && c.cuantificable !== false) {
    impacto = kv([
      ['Método', esc(c.metodo)],
      ['Escenario adverso (P5)', money(c.p5)],
      ['Escenario central (P50)', `<b style="color:var(--color-green)">${money(c.p50)}</b>`],
      ['Escenario favorable (P95)', money(c.p95)],
      ['Forma de la distribución', esc(c.sesgo)],
      ['Componentes', (c.componentes || []).map((x) =>
        `${esc(x.concepto)}: ${money(x.min)} → ${money(x.moda)} → ${money(x.max)}`).join('<br>')],
      ['Lectura', `<span class="mdo-note" style="font-style:normal">${esc(c.lectura)}</span>`],
      ['Supuesto clave', c.supuestoClave ? `<span class="mdo-note" style="font-style:normal">${esc(c.supuestoClave)}</span>` : null],
    ]);
  } else {
    impacto = `<p class="mdo-note">${esc(c?.razon || 'Impacto no cuantificado.')}</p>`;
  }
  return bloque(1, 'Sustento matemático',
    kv([['Método', esc(s.metodo)]]) +
    `<div class="mdo-formula">${esc(s.calculoConDatosDelCliente)}</div>` +
    kv([['Datos de entrada', (s.datosDeEntrada || []).map(esc).join('<br>')]]) +
    impacto);
}

function sustentoEstadistico(s) {
  const c = s.confianzaCompuesta;
  return bloque(2, 'Sustento estadístico',
    kv([
      ['Nivel de evidencia', `${esc(s.nivelDeEvidencia)} — <span class="mdo-note" style="font-style:normal">${esc(s.descripcion)}</span>`],
      ['Tamaño de muestra', s.tamañoDeMuestra ? `n = ${s.tamañoDeMuestra}` : 'no aplica'],
      ['p-valor', s.pValor !== null && s.pValor !== undefined
        ? `${num(s.pValor, 5)} ${s.significativo ? '<span class="mdo-chip mdo-chip--conf-alta">significativo</span>' : '<span class="mdo-chip mdo-chip--conf-baja">no significativo</span>'}`
        : 'no aplica (cálculo determinista)'],
      ['Confianza compuesta', `${num(c.score, 3)} <span class="mdo-chip mdo-chip--conf-${c.banda.toLowerCase()}">${esc(c.banda)}</span>`],
      ['Fórmula', `<span class="mdo-note" style="font-style:normal">${esc(c.formula)}</span>`],
      ['Factores', Object.entries(c.factores).map(([k, v]) => `${esc(k)}: ${num(v, 3)}`).join(' · ')],
      ['Cómo usarlo', `<b>${esc(s.lecturaRecomendada)}</b>`],
      ['Limitaciones', (s.limitacionesDeclaradas || []).length
        ? (s.limitacionesDeclaradas).map((x) => `<div class="mdo-note" style="font-style:normal">⚠ ${esc(x)}</div>`).join('')
        : '<span class="mdo-note" style="font-style:normal">Sin limitaciones adicionales declaradas.</span>'],
    ]));
}

function sustentoFinanciero(s) {
  if (!s.completo) return bloque(3, 'Sustento financiero', `<p class="mdo-note">${esc(s.razon || 'No cuantificable con los datos disponibles.')}</p>`, true);
  const e = s.evaluacion, i = s.inversionEstimada, r = s.pruebaDeResistencia;
  return bloque(3, 'Sustento financiero',
    kv([
      ['Inversión estimada', `${money(i.tipica)} <small style="color:var(--mdo-muted)">(rango ${money(i.minima)} – ${money(i.maxima)})</small>`],
      ['Base del anclaje', `<span class="mdo-note" style="font-style:normal">${esc(i.baseDeAnclaje)}</span>`],
      ['Contingencia legal', s.contingenciaLegalIncluida.monto > 0
        ? `${money(s.contingenciaLegalIncluida.monto)} — <span class="mdo-note" style="font-style:normal">${esc(s.contingenciaLegalIncluida.origen)}</span>`
        : `<span class="mdo-note" style="font-style:normal">${esc(s.contingenciaLegalIncluida.origen)}</span>`],
      ['Supuesto de captura', `<span class="mdo-note" style="font-style:normal">${esc(s.supuestoDeCaptura)}</span>`],
      ['Beneficio neto anual', money(s.beneficioAnualNeto)],
      ['VPN', `<b style="color:${e.vpn > 0 ? 'var(--color-green)' : 'var(--mdo-red)'}">${money(e.vpn)}</b> a ${pctf(e.tasaDescuento)} en ${e.horizonteAños} años`],
      ['TIR', esc(e.tirLegible)],
      ['Recuperación', e.paybackAños !== null ? `${num(e.paybackAños)} años` : 'no se recupera en el horizonte'],
      ['Veredicto', `<b>${esc(e.veredicto)}</b>`],
      ['Prueba de resistencia', r
        ? `${esc(r.escenario)}<br>VPN pesimista: <b style="color:${r.resiste ? 'var(--color-green)' : 'var(--mdo-red)'}">${money(r.vpn)}</b> — ${esc(r.veredicto)}`
        : null],
    ]));
}

function sustentoJuridicoHTML(s) {
  if (!s.completo) {
    return bloque(4, 'Sustento jurídico',
      `<p class="mdo-note">${esc(s.razon)}</p>
       <div class="mdo-hard">${esc(s.advertenciaGeneral)}</div>
       <p class="mdo-note">${esc(s.disclaimer)}</p>`, true);
  }
  const normas = (s.normasAplicables || []).map((n) => `<div class="mdo-law">
      <b>${esc(n.cita)}</b>${n.reforma ? ` <span class="mdo-chip mdo-chip--media">${esc(n.reforma)}</span>` : ''}
      ${n.requiereVerificacion ? ' <span class="mdo-chip mdo-chip--alta">verificar vigencia</span>' : ''}
      <div>${esc(n.sintesis)}</div>
      ${n.implicacion ? `<div class="mdo-note" style="font-style:normal"><b>Implicación:</b> ${esc(n.implicacion)}</div>` : ''}
      ${n.riesgo ? `<div class="mdo-note" style="font-style:normal"><b>Riesgo de incumplimiento:</b> ${esc(n.riesgo)}</div>` : ''}
      ${n.notaVerificacion ? `<div class="mdo-note" style="font-style:normal">⚠ ${esc(n.notaVerificacion)}</div>` : ''}
    </div>`).join('');
  return bloque(4, 'Sustento jurídico',
    kv([['Jurisdicción', `${esc(s.jurisdiccion)} · corte normativo ${esc(s.corteNormativo)}`]]) +
    `<div style="margin:var(--space-3) 0 var(--space-2);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--mdo-muted)">Normas aplicables</div>${normas}` +
    `<div style="margin:var(--space-4) 0 var(--space-2);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--mdo-muted)">Obligaciones previas a la ejecución</div>
     <ol class="mdo-steps">${(s.obligacionesPrevias || []).map((o) => `<li>${esc(o)}</li>`).join('')}</ol>` +
    `<div style="margin:var(--space-4) 0 var(--space-2);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--mdo-muted)">Barreras infranqueables</div>
     ${(s.barrerasDuras || []).map((b) => `<div class="mdo-hard">⛔ ${esc(b)}</div>`).join('')}` +
    kv([['Contingencia a provisionar', esc(s.contingenciaACuantificar)]]) +
    `<p class="mdo-note">${esc(s.disclaimer)}</p>`);
}

function sustentoOperativo(s) {
  return bloque(5, 'Sustento operativo',
    kv([
      ['Intervención', `<b>${esc(s.intervencion)}</b>`],
      ['Objetivo', esc(s.objetivo)],
      ['Por qué funciona', esc(s.mecanismoDeAccion)],
      ['Esfuerzo', `${esc(s.esfuerzo.etiqueta)} — <span class="mdo-note" style="font-style:normal">${esc(s.esfuerzo.descripcion)}</span>`],
      ['Rampa de adopción', `${s.rampaMeses} mes(es)`],
    ]) +
    `<div style="margin:var(--space-3) 0 var(--space-2);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--mdo-muted)">Pasos</div>
     <ol class="mdo-steps">${s.pasos.map((p) => `<li>${esc(p.accion)}</li>`).join('')}</ol>` +
    kv([
      ['Indicador de éxito', `<b>${esc(s.indicadorDeExito.nombre)}</b> → objetivo ${esc(String(s.indicadorDeExito.objetivo))} en ${s.indicadorDeExito.plazoDias} días`],
      ['Señal de aborto', `<span style="color:var(--mdo-amber)">${esc(s.señalDeAborto)}</span>`],
    ]) +
    `<p class="mdo-note">${esc(s.notaSobreLaSeñalDeAborto)}</p>`);
}

function sustentoRiesgo(s) {
  return bloque(6, 'Sustento de riesgo',
    kv([
      ['Severidad', `${esc(s.severidad.etiqueta)} (${s.severidad.valor}/10)`],
      ['Costo de NO actuar', `<b>${esc(s.riesgoDeNoActuar)}</b>`],
      ['Apalancamiento sistémico', `${s.esRestriccionDelSistema ? '<span class="mdo-chip mdo-chip--toc">EN LA RESTRICCIÓN</span> ' : ''}<span class="mdo-note" style="font-style:normal">${esc(s.notaTOC)}</span>`],
    ]) +
    `<div style="margin:var(--space-3) 0 var(--space-2);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--mdo-muted)">Riesgos de ejecución</div>
     ${s.riesgosDeEjecucion.map((r) => `<div class="mdo-risk">
        <b>${esc(r.riesgo)}</b> <span class="mdo-chip mdo-chip--${r.probabilidad === 'alta' ? 'critica' : r.probabilidad === 'media' ? 'alta' : 'baja'}">prob. ${esc(r.probabilidad)}</span>
        <div>Mitigación: ${esc(r.mitigacion)}</div>
      </div>`).join('')}`);
}

function sustentoEvidencia(s) {
  const fuentes = (s.fuentesAplicables || []).map((f) => `<div class="mdo-law">
      <b>${esc(f.referencia)}</b>${f.año ? ` (${f.año})` : ''}
      <span class="mdo-chip mdo-chip--conf-${f.nivelDeConfianza === 'alta' ? 'alta' : f.nivelDeConfianza === 'media' ? 'media' : 'baja'}">${esc(f.nivelDeConfianza)}</span>
      ${f.muestra ? `<div class="mdo-note" style="font-style:normal">Muestra: ${esc(f.muestra)}</div>` : ''}
      ${f.nota ? `<div class="mdo-note" style="font-style:normal">${esc(f.nota)}</div>` : ''}
    </div>`).join('');
  return bloque(7, 'Sustento de evidencia',
    (fuentes || '<p class="mdo-note">Sin referencias externas aplicables a este dominio.</p>') +
    kv([
      ['Datos internos', (s.fuentesInternas || []).map(esc).join('<br>')],
      ['Naturaleza', `<span class="mdo-note" style="font-style:normal">${esc(s.naturalezaDeLaEvidencia)}</span>`],
    ]) +
    `<p class="mdo-note">${esc(s.advertenciaSobreBenchmarks)}</p>`, !s.completo);
}

function sustentoSalud(s) {
  if (!s.aplicable) return '';
  return bloque(8, 'Sustento de salud ocupacional',
    kv([
      ['Hallazgo epidemiológico', esc(s.hallazgoEpidemiologico)],
      ['Fuente', `${esc(s.fuente)} (${s.año}) <span class="mdo-chip mdo-chip--conf-alta">${esc(s.confianza)}</span>`],
      ['Muestra', esc(s.muestra)],
      ['Desgaste ocupacional', esc(s.desgasteOcupacional)],
      ['Productividad', esc(s.productividad)],
      ['Obligación normativa', `<b>${esc(s.obligacionNormativa)}</b>`],
    ]) +
    `<div class="mdo-hard">${esc(s.limitacion)}</div>`);
}

/* ── Hallazgo completo ──────────────────────────────────────────────── */

function renderHallazgo(h, idx) {
  const sol = h.solucion;
  const p50 = h.impacto?.cuantificable ? h.impacto.p50 : null;
  const cls = chipClase(h.prioridad?.clase);

  const cuerpoSol = sol && sol.sustentos && Object.keys(sol.sustentos).length
    ? sustentoMatematico(sol.sustentos.matematico)
      + sustentoEstadistico(sol.sustentos.estadistico)
      + sustentoFinanciero(sol.sustentos.financiero)
      + sustentoJuridicoHTML(sol.sustentos.juridico)
      + sustentoOperativo(sol.sustentos.operativo)
      + sustentoRiesgo(sol.sustentos.riesgo)
      + sustentoEvidencia(sol.sustentos.evidencia)
      + sustentoSalud(sol.sustentos.saludOcupacional)
    : `<div class="mdo-alert mdo-alert--media"><strong>Sin solución propuesta</strong>${esc(sol?.razonIncompleta || '')}</div>`;

  const resumen = sol?.resumenEjecutivo ? `<div class="mdo-card" style="background:var(--mdo-panel-2);margin:var(--space-4) 0">
      ${kv([
        ['Qué hacer', `<b>${esc(sol.resumenEjecutivo.queHacer)}</b>`],
        ['Primer paso', esc(sol.resumenEjecutivo.primerPaso)],
        ['Cuesta', money(sol.resumenEjecutivo.cuantoCuesta)],
        ['Devuelve al año', money(sol.resumenEjecutivo.cuantoDevuelve)],
        ['VPN', money(sol.resumenEjecutivo.vpn)],
        ['Cuándo detenerse', `<span style="color:var(--mdo-amber)">${esc(sol.resumenEjecutivo.cuandoDetenerse)}</span>`],
      ])}
    </div>` : '';

  return `<article class="mdo-finding" data-open="false">
    <button class="mdo-finding__head" aria-expanded="false" data-toggle>
      <div>
        <div class="mdo-finding__meta">
          <span class="mdo-chip mdo-chip--${cls}">${esc(h.prioridad?.clase || '')}</span>
          <span class="mdo-chip mdo-chip--conf-${(h.confianza?.banda || 'baja').toLowerCase()}">confianza ${esc(h.confianza?.banda || '')}</span>
          ${h.esRestriccion ? '<span class="mdo-chip mdo-chip--toc">RESTRICCIÓN</span>' : ''}
          <span class="mdo-finding__num">${esc(h.id)} · ${esc(h.dominio)} · IPI ${num(h.prioridad?.ipi, 4)}</span>
        </div>
        <h3 class="mdo-finding__title">${idx}. ${esc(h.titulo)}</h3>
      </div>
      <div class="mdo-finding__impact">
        <b>${p50 !== null ? money(p50) : '—'}</b>
        <small>${p50 !== null ? `P5 ${money(h.impacto.p5)} · P95 ${money(h.impacto.p95)}` : 'no cuantificado'}</small>
      </div>
    </button>
    <div class="mdo-finding__body">
      <p class="mdo-desc">${esc(h.descripcion)}</p>
      ${resumen}
      ${cuerpoSol}
    </div>
  </article>`;
}

/* ── Informe ────────────────────────────────────────────────────────── */

function render(r) {
  const out = $('#mdo-out');
  if (!r.ejecutado) {
    out.innerHTML = `<div class="mdo-section"><div class="mdo-alert mdo-alert--alta">
      <strong>El motor se abstuvo de ejecutar</strong>${esc(r.razon)}
      <ul>${r.validacion.errores.map((e) => `<li>${esc(e.campo)}: ${esc(e.mensaje)}</li>`).join('')}</ul>
    </div></div>`;
    return;
  }
  MONEDA = r.empresa.moneda || 'MXN';
  const i = r.resumen.impactoAnualIdentificado;
  const cs = i.controlDeSolapamiento;

  const tarjetas = `<div class="mdo-grid mdo-grid--4">
    <div class="mdo-card mdo-stat mdo-stat--green">
      <div class="mdo-stat__label">Impacto anual identificado</div>
      <div class="mdo-stat__value">${money(i.p50)}</div>
      <div class="mdo-stat__sub">P5 ${money(i.p5)} — P95 ${money(i.p95)} · ${pctf(i.comoPctIngresos)} de ingresos</div>
    </div>
    <div class="mdo-card mdo-stat">
      <div class="mdo-stat__label">Hallazgos</div>
      <div class="mdo-stat__value">${r.resumen.hallazgosTotales}</div>
      <div class="mdo-stat__sub">${r.resumen.hallazgosCuantificados} cuantificados · ${r.resumen.dominiosEvaluados}/${r.resumen.dominiosTotales} dominios evaluados</div>
    </div>
    <div class="mdo-card mdo-stat mdo-stat--amber">
      <div class="mdo-stat__label">Inversión estimada</div>
      <div class="mdo-stat__value">${money(r.resumen.inversionRequeridaEstimada)}</div>
      <div class="mdo-stat__sub">VPN agregado ${money(r.resumen.vpnAgregado)}</div>
    </div>
    <div class="mdo-card mdo-stat">
      <div class="mdo-stat__label">Restricción del sistema</div>
      <div class="mdo-stat__value" style="font-size:var(--text-xl);color:var(--color-green)">${esc(r.resumen.restriccionDelSistema || 'no identificada')}</div>
      <div class="mdo-stat__sub">Gobierna el throughput de toda la cadena</div>
    </div>
  </div>`;

  const avisos = r.advertencias.map((a) => `<div class="mdo-alert mdo-alert--${a.severidad}">
      <strong>${esc(a.tipo.replace(/_/g, ' ').toUpperCase())}</strong>${esc(a.mensaje)}</div>`).join('');

  const solapamiento = `<table class="mdo-table">
    <thead><tr><th>Familia de causa raíz</th><th class="num">Hallazgos</th><th class="num">Suma</th><th class="num">Se reconoce</th><th class="num">Descontado</th></tr></thead>
    <tbody>${cs.familias.map((f) => `<tr>
      <td>${esc(f.nombre)}<div class="mdo-note" style="font-style:normal">${esc(f.razon)}</div></td>
      <td class="num">${f.n}</td><td class="num">${money(f.sumaDeLaFamilia)}</td>
      <td class="num" style="color:var(--color-green)">${money(f.reconocido)}</td>
      <td class="num" style="color:var(--mdo-muted)">−${money(f.descontado)}</td></tr>`).join('')}
    <tr><td><b>Total</b><div class="mdo-note" style="font-style:normal">${esc(cs.hallazgosIndependientes)} hallazgo(s) sin familia se suman íntegros.</div></td>
      <td class="num"></td><td class="num">${money(cs.sumaIngenua)}</td>
      <td class="num"><b style="color:var(--color-green)">${money(cs.agregadoConservador)}</b></td>
      <td class="num">−${money(cs.descontadoPorSolapamiento)} (${pctf(cs.pctDescontado)})</td></tr></tbody></table>
    <p class="mdo-note">${esc(cs.reglaAplicada)}</p>
    <p class="mdo-note">${esc(cs.advertencia)}</p>`;

  const suficiencia = `<div class="mdo-grid mdo-grid--3">${Object.entries(r.suficienciaDeDatos).map(([k, v]) => {
    const cl = v.isd < 0.5 ? 'mdo-bar--low' : v.isd < 0.75 ? 'mdo-bar--mid' : '';
    return `<div class="mdo-card">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <b style="text-transform:capitalize">${esc(k)}</b>
        <span class="mdo-chip mdo-chip--${v.evaluable ? 'conf-alta' : 'critica'}">${v.evaluable ? 'evaluado' : 'sin datos'}</span>
      </div>
      <div class="mdo-bar ${cl}"><i style="width:${Math.round(v.isd * 100)}%"></i></div>
      <div class="mdo-stat__sub">ISD ${num(v.isd, 2)} / umbral ${v.umbral}</div>
      ${v.insumosFaltantes.length ? `<div class="mdo-note">Falta: ${esc(v.insumosFaltantes.join('; '))}</div>` : ''}
    </div>`;
  }).join('')}</div>`;

  const olas = `<div class="mdo-grid mdo-grid--2">${r.plan.olas.map((o) => `<div class="mdo-card">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <b>Ola ${o.ola} · ${esc(o.horizonte)}</b>
        <span style="color:var(--color-green);font-weight:var(--font-bold)">${money(o.impactoP50Acumulado)}</span>
      </div>
      <div class="mdo-stat__sub">${o.hallazgos.length} hallazgos · esfuerzo ${o.esfuerzoComprometido}/${r.plan.capacidadPorOla}</div>
      <div class="mdo-note" style="font-style:normal">${esc(o.hallazgos.join(' · '))}</div>
      <div class="mdo-note">${esc(o.criterio)}</div>
    </div>`).join('')}
    <div class="mdo-card" style="border-style:dashed">
      <b>Cartera de seguimiento</b>
      <div class="mdo-stat__sub">${r.plan.cartera.n} hallazgos · ${money(r.plan.cartera.impactoP50Acumulado)}</div>
      <div class="mdo-note">${esc(r.plan.cartera.criterio)}</div>
    </div></div>
    <p class="mdo-note">${esc(r.plan.principioDeSecuencia)}</p>`;

  out.innerHTML = `
    <section class="mdo-section">
      <h2>Diagnóstico · ${esc(r.empresa.nombre)} · ${esc(r.empresa.periodo)}</h2>
      ${tarjetas}
    </section>

    ${avisos ? `<section class="mdo-section"><h2>Advertencias de integridad del informe</h2>${avisos}</section>` : ''}

    <section class="mdo-section">
      <h2>Control de solapamiento entre hallazgos</h2>
      ${solapamiento}
    </section>

    <section class="mdo-section">
      <h2>Suficiencia de datos por dominio</h2>
      ${suficiencia}
    </section>

    <section class="mdo-section">
      <h2>Secuencia de ejecución</h2>
      ${olas}
    </section>

    <section class="mdo-section">
      <h2>Hallazgos y soluciones sustentadas — ${r.plan.ranking.length} en orden de prioridad</h2>
      <p class="mdo-note" style="margin-bottom:var(--space-5)">Cada hallazgo despliega su solución con los siete campos de sustento: matemático, estadístico, financiero, jurídico, operativo, de riesgo y de evidencia. El octavo campo, salud ocupacional, aparece cuando el hallazgo lo involucra.</p>
      ${r.plan.ranking.map((h, n) => renderHallazgo(h, n + 1)).join('')}
    </section>

    <section class="mdo-section">
      <h2>Marco de integridad</h2>
      <div class="mdo-card">
        <b>Principios del motor</b>
        <ul>${r.marcoDeIntegridad.principios.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <b>Limitaciones estructurales</b>
        <ul>${r.marcoDeIntegridad.limitacionesEstructurales.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="mdo-hard" style="margin-top:var(--space-4)">${esc(r.marcoDeIntegridad.disclaimerJuridico)}</div>
        <p class="mdo-note">Motor v${esc(r.version)} · ${r.marcoDeIntegridad.totalFuentesExternas} fuentes externas catalogadas · corte normativo ${esc(r.marcoDeIntegridad.corteNormativo)} · semilla ${r.semilla} (informe reproducible) · generado en ${r.duracionMs} ms</p>
      </div>
    </section>`;

  out.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-toggle]');
    if (!btn) return;
    const card = btn.closest('.mdo-finding');
    const abierto = card.dataset.open === 'true';
    card.dataset.open = abierto ? 'false' : 'true';
    btn.setAttribute('aria-expanded', String(!abierto));
  });

  window.__INTELIS_INFORME__ = r;
}

/* ── Arranque ───────────────────────────────────────────────────────── */

let ultimoDataset = EMPRESA_DEMO;

function ejecutar(dataset) {
  ultimoDataset = dataset;
  $('#mdo-out').innerHTML = '<div class="mdo-empty">Ejecutando los siete detectores…</div>';
  // Se cede un cuadro al navegador para que el estado de carga se pinte.
  requestAnimationFrame(() => {
    try {
      render(diagnosticar(dataset));
    } catch (e) {
      $('#mdo-out').innerHTML = `<div class="mdo-section"><div class="mdo-alert mdo-alert--alta">
        <strong>Error de ejecución</strong>${esc(e.message)}</div></div>`;
      console.error(e);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  $('#mdo-version').textContent = `v${VERSION}`;
  $('#btn-demo').addEventListener('click', () => ejecutar(EMPRESA_DEMO));
  $('#btn-cargar').addEventListener('click', () => $('#file-datos').click());
  $('#btn-esquema').addEventListener('click', async () => {
    const { ESQUEMA } = await import('../engine/core/schema.js');
    descargar('intelis-esquema-de-datos.json', JSON.stringify(ESQUEMA, null, 2));
  });
  $('#btn-json').addEventListener('click', () => {
    if (!window.__INTELIS_INFORME__) return;
    descargar('intelis-informe.json', JSON.stringify(window.__INTELIS_INFORME__, null, 2));
  });
  $('#btn-imprimir').addEventListener('click', () => window.print());

  $('#file-datos').addEventListener('change', (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try { ejecutar(JSON.parse(fr.result)); }
      catch (e) {
        $('#mdo-out').innerHTML = `<div class="mdo-section"><div class="mdo-alert mdo-alert--alta">
          <strong>JSON inválido</strong>${esc(e.message)}</div></div>`;
      }
    };
    fr.readAsText(f);
    ev.target.value = '';
  });

  ejecutar(EMPRESA_DEMO);
});

function descargar(nombre, contenido) {
  const b = new Blob([contenido], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nombre;
  a.click(); URL.revokeObjectURL(a.href);
}
