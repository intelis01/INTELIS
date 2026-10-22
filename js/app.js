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

  /* ── AZIMUT: el destello sólo corre mientras el título está en pantalla ── */
  var az = $('.az-hero');
  if (az && IO && !RM){
    new IntersectionObserver(function(es){ az.classList.toggle('az-on', es[0].isIntersecting); }, {threshold:.2}).observe(az);
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

  /* La página activa y su marca en el menú se resuelven en CSS (:target) */

  /* ── Botones de página: se ve el push completo y luego se cambia de página ── */
  $$('.pg, .cover-go').forEach(function(a){
    a.addEventListener('click', function(e){
      if (RM) return;
      e.preventDefault();
      a.classList.remove('push'); void a.offsetWidth; a.classList.add('push');
      setTimeout(function(){ a.classList.remove('push'); location.hash = a.getAttribute('href'); }, 260);
    });
  });

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
          (g[3] ? '<span class="g-src">Referencia INEGI</span>'
                : '<span class="g-src no" title="No existe fuente oficial publicada; el referente se identifica como estimado">Sin fuente oficial</span>') + '</div>');
      }
      list.innerHTML = n ? out.join('') : '<div class="g-empty">Su giro no aparece en la lista. Escríbanos y lo evaluaremos antes de cotizar.</div>';
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

})();
