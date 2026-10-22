/* ═══════════════════════════════════════════════════════════════════
   INTELIS · interacción del sitio
   Reglas de fluidez:
     · Un solo manejador de scroll, pasivo y agrupado en requestAnimationFrame.
     · Se escribe sólo transform/opacity o texto; nunca se lee el layout
       dentro del mismo cuadro en que se escribe.
     · Las apariciones las dispara IntersectionObserver, no el scroll.
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s,c){ return (c||document).querySelector(s); };
  var $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
  var IO = 'IntersectionObserver' in window;

  /* ── Apariciones ── */
  var rv = $$('.rv');
  if (RM || !IO) rv.forEach(function(e){ e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -6% 0px', threshold:.08});
    rv.forEach(function(e){ io.observe(e); });
  }

  /* ── Contadores ── */
  function countTo(el, to, ms, fmt){
    if (RM){ el.textContent = fmt ? fmt(to) : to; return; }
    var t0 = performance.now();
    (function step(now){
      var k = Math.min(1,(now-t0)/ms), v = Math.round(to*(1-Math.pow(1-k,3)));
      el.textContent = fmt ? fmt(v) : v;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  if (IO){
    var cio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.hasAttribute('data-count')) countTo(el, +el.getAttribute('data-count'), 1100);
        if (el.id === 'azNum') countTo(el, 60, 1300);
        if (el.id === 'evid') el.classList.add('in');
        cio.unobserve(el);
      });
    }, {threshold:.5});
    $$('[data-count]').concat([$('#azNum'), $('#evid')]).forEach(function(e){ if (e) cio.observe(e); });
  }

  /* ── Cabecera: progreso, sección activa, botón flotante ── */
  var prog = $('#prog'), flt = $('#float'), ticking = false, docH = 1, vh = 1;
  function measure(){ vh = window.innerHeight; docH = Math.max(1, document.documentElement.scrollHeight - vh); }
  function onScroll(){
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    prog.style.transform = 'scaleX(' + Math.min(1, y/docH).toFixed(4) + ')';
    flt.classList.toggle('on', y > vh*.9);
  }
  measure(); onScroll();
  window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
  window.addEventListener('resize', function(){ measure(); onScroll(); }, {passive:true});
  window.addEventListener('load', function(){ measure(); onScroll(); });

  var navA = $$('.nav a');
  if (IO){
    var map = {};
    navA.forEach(function(a){ map[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var a = map[e.target.id];
        navA.forEach(function(x){ x.classList.toggle('on', x === a); });
      });
    }, {rootMargin:'-45% 0px -50% 0px'});
    /* Se observan todas las secciones: en las que no tienen enlace, ninguno queda marcado */
    $$('main > section').forEach(function(s){ sio.observe(s); });
  }

  /* ── Consola de la portada: el interruptor enciende las cinco placas ── */
  var sw = $('#sw'), plates = $$('#plates .plate'), timers = [];
  var roMods = $('#roMods'), roBar = $('#roBar'), roCards = $('#roCards'), roTime = $('#roTime');
  function setSwitch(on){
    timers.forEach(clearTimeout); timers = [];
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    sw.classList.add('was');
    var gap = RM ? 0 : 150, n = 0;
    if (on){
      plates.forEach(function(p,i){
        timers.push(setTimeout(function(){
          p.classList.add('lit'); n++;
          roMods.textContent = n;
          roBar.style.transform = 'scaleX(' + (n/5) + ')';
          if (n === 5){
            countTo(roCards, 18, 700);
            roTime.innerHTML = '&lt; 60 s';
          }
        }, 260 + i*gap));
      });
    } else {
      plates.slice().reverse().forEach(function(p,i){
        timers.push(setTimeout(function(){ p.classList.remove('lit'); }, i*60));
      });
      roMods.textContent = '0'; roBar.style.transform = 'scaleX(0)';
      roCards.textContent = '0'; roTime.textContent = '—';
    }
  }
  sw.addEventListener('click', function(){ sw.dataset.touched = '1'; setSwitch(sw.getAttribute('aria-checked') !== 'true'); });
  /* Se enciende sola una vez, cuando la consola entra en vista, salvo que el visitante ya la haya tocado */
  if (IO){
    var swo = new IntersectionObserver(function(es){
      if (es[0].isIntersecting){
        swo.disconnect();
        setTimeout(function(){ if (!sw.dataset.touched) setSwitch(true); }, RM ? 0 : 1100);
      }
    }, {threshold:.6});
    swo.observe($('.console'));
  } else setSwitch(true);

  /* ── Acordeones: altura animada por grid-template-rows, sin medir ── */
  $$('.card-tab').forEach(function(b){
    b.addEventListener('click', function(){
      var c = b.parentNode, open = !c.classList.contains('open');
      c.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ── Pantallas del diagnóstico (pestañas) ── */
  var tabs = $$('.scr');
  function selectTab(t, focus){
    tabs.forEach(function(x){
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).classList.toggle('on', on);
    });
    if (focus) t.focus();
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click', function(){ selectTab(t); });
    t.addEventListener('keydown', function(e){
      var k = e.key, j = -1;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = (i+1) % tabs.length;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i-1+tabs.length) % tabs.length;
      else if (k === 'Home') j = 0; else if (k === 'End') j = tabs.length-1;
      if (j > -1){ e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* ── Catálogo de giros ── */
  function initGiros(){
    var G = window.GIROS || [], GR = window.GRUPOS || {};
    var list = $('#glist'), chips = $('#gchips'), q = $('#gq'), count = $('#gcount');
    var grp = 'todos';
    var norm = function(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); };
    var idx = G.map(function(g){ return norm(g[0]+' '+g[1]+' '+(GR[g[2]]||'')); });
    var counts = {}; G.forEach(function(g){ counts[g[2]] = (counts[g[2]]||0) + 1; });
    var html = '<button class="g-chip" aria-pressed="true" data-g="todos">Todos<em>' + G.length + '</em></button>';
    Object.keys(GR).forEach(function(k){ html += '<button class="g-chip" aria-pressed="false" data-g="'+k+'">'+GR[k]+'<em>'+(counts[k]||0)+'</em></button>'; });
    chips.innerHTML = html;
    var esc = function(s){ return s.replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
    function render(){
      var t = norm(q.value.trim()), out = [], n = 0;
      for (var i = 0; i < G.length; i++){
        var g = G[i];
        if (grp !== 'todos' && g[2] !== grp) continue;
        if (t && idx[i].indexOf(t) < 0) continue;
        n++;
        out.push('<div class="g-it"><div class="gt"><b>'+esc(g[0])+'</b><span>'+esc(g[1])+'</span></div>' +
          (g[3] ? '<span class="g-src" title="INEGI, Censos Económicos 2024 · SCIAN '+g[3]+'">INEGI · '+g[3]+'</span>'
                : '<span class="g-src no" title="No existe fuente oficial publicada; el rango es estimado">Sin fuente oficial</span>') + '</div>');
      }
      list.innerHTML = n ? out.join('') : '<div class="g-empty">Su giro no aparece en la lista. Escríbanos: lo evaluamos con usted antes de cotizar.</div>';
      count.innerHTML = '<b>' + n + '</b> ' + (n === 1 ? 'giro' : 'giros');
    }
    chips.addEventListener('click', function(e){
      var b = e.target.closest('.g-chip'); if (!b) return;
      grp = b.dataset.g;
      $$('.g-chip', chips).forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    });
    var qt; q.addEventListener('input', function(){ clearTimeout(qt); qt = setTimeout(render, 60); });
    render();
  }
  if (window.GIROS) initGiros(); else window.addEventListener('load', initGiros);

  /* ── Inversión · tabla base de MERIDIAN (honorarios antes de IVA) ── */
  var SEG = [
    {hasta:1200000,  dx:3500,  mes:1500},
    {hasta:3600000,  dx:5500,  mes:2500},
    {hasta:6000000,  dx:8500,  mes:5500},
    {hasta:12000000, dx:12000, mes:7500},
    {hasta:25000000, dx:18000, mes:10000}
  ];
  var rF = $('#rFact'), rM = $('#rMes'), inv = $('#inv'), rows = $$('#tbl tbody tr');
  var peso = new Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN', maximumFractionDigits:0});
  var MIN = 300000, MAX = 30000000;
  /* Escala logarítmica: la empresa de $500 mil y la de $20 M tienen el mismo recorrido de dedo */
  var toFact = function(v){ var f = MIN * Math.pow(MAX/MIN, v/1000); return f < 1e6 ? Math.round(f/10000)*10000 : Math.round(f/100000)*100000; };
  var fmtM = function(f){ return f >= 1e6 ? '$' + (f/1e6).toFixed(1) + ' M' : '$' + Math.round(f/1000) + ' mil'; };
  var shown = {dx:0, mes:0, tot:0}, raf = 0;
  function tween(to){
    cancelAnimationFrame(raf);
    var from = {dx:shown.dx, mes:shown.mes, tot:shown.tot}, t0 = performance.now();
    (function step(now){
      var k = RM ? 1 : Math.min(1,(now-t0)/320), e = 1-Math.pow(1-k,3);
      ['dx','mes','tot'].forEach(function(key){ shown[key] = from[key] + (to[key]-from[key])*e; });
      $('#fDx').textContent = peso.format(shown.dx);
      $('#fMes').textContent = peso.format(shown.mes);
      $('#fTot').textContent = peso.format(shown.tot);
      if (k < 1) raf = requestAnimationFrame(step);
    })(t0);
  }
  function calc(){
    var f = toFact(+rF.value), m = +rM.value;
    $('#oFact').textContent = fmtM(f);
    $('#oMes').textContent = m === 0 ? 'Sólo diagnóstico' : m + (m === 1 ? ' mes' : ' meses');
    rF.setAttribute('aria-valuetext', fmtM(f));
    rM.setAttribute('aria-valuetext', $('#oMes').textContent);
    var si = -1; for (var i = 0; i < SEG.length; i++){ if (f <= SEG[i].hasta){ si = i; break; } }
    rows.forEach(function(r,i){ r.classList.toggle('on', i === (si < 0 ? SEG.length : si)); });
    inv.classList.toggle('custom', si < 0);
    if (si < 0) return;
    var s = SEG[si];
    $('#fMesN').textContent = m === 0 ? 'sin seguimiento' : 'por mes · ' + m + (m === 1 ? ' mes' : ' meses');
    tween({dx:s.dx, mes:m ? s.mes : 0, tot:s.dx + s.mes*m});
  }
  [rF, rM].forEach(function(r){ r.addEventListener('input', calc); });
  calc();
})();
