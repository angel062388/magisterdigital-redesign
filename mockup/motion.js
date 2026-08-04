/* ==========================================================================
   MAGISTER DIGITAL — MOTION

   Two headline effects:
     A. Simulated collaborative presence over the hero headline
     B. Ambient background motion behind "what lands on the call"

   Plus supporting reveals, header state, panels and the FAQ disclosure.

   Contract:
   - Nothing here is required for the page to be readable. The stylesheet
     carries an html:not(.js) failsafe, and any throw below still leaves the
     page complete because .js is only added after a successful start.
   - prefers-reduced-motion disables every effect to a clean static state.
   - Decorative layers are aria-hidden and pointer-events:none.
   - Only transform and opacity are animated. Offscreen work is paused.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* Reduced motion, or no observer support: show the finished state, stop. */
  if (reduced || !canObserve) {
    root.classList.add('js', reduced ? 'reduced-motion' : 'no-io');
    [].forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
      el.classList.add('in');
    });
    [].forEach.call(document.querySelectorAll('[data-flap]'), function (el) {
      el.textContent = el.getAttribute('data-flap');
    });
    var pres = document.querySelector('.presence');
    if (pres) pres.style.display = 'none';           // frozen == hidden here
    [].forEach.call(document.querySelectorAll('[data-ambient]'), function (a) {
      a.classList.add('paused');                     // static gradient, no drift
    });
    return;
  }

  root.classList.add('js');

  function observe(sel, onIn, opts) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        onIn(e.target);
        io.unobserve(e.target);
      });
    }, opts || { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    [].forEach.call(document.querySelectorAll(sel), function (el) { io.observe(el); });
  }

  /* ---- Reveals ---------------------------------------------------------- */
  observe('[data-reveal]', function (el) {
    [].forEach.call(el.querySelectorAll('[data-stagger]'), function (kid, i) {
      kid.style.setProperty('--i', i);
    });
    el.classList.add('in');
  });

  /* Safety net: if anything is still unrevealed after 4s, reveal it. */
  setTimeout(function () {
    [].forEach.call(document.querySelectorAll('[data-reveal]:not(.in)'), function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('in');
    });
  }, 4000);

  /* ---- Split-flap mono metadata ---------------------------------------- */
  var FLAP = '0123456789/—·ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  observe('[data-flap]', function (el) {
    var final = el.getAttribute('data-flap') || el.textContent;
    var chars = final.split(''), frame = 0;
    var settle = chars.map(function (_, i) { return 6 + i * 3; });
    var total = settle[settle.length - 1] + 2;
    el.classList.add('flapping');
    (function tick() {
      el.textContent = chars.map(function (c, i) {
        if (frame >= settle[i] || c === ' ') return c;
        return FLAP[(Math.random() * FLAP.length) | 0];
      }).join('');
      if (frame++ < total) requestAnimationFrame(tick);
      else { el.textContent = final; el.classList.remove('flapping'); }
    })();
  }, { threshold: 0.6 });

  /* ======================================================================
     A. SIMULATED COLLABORATIVE PRESENCE
     Three labelled cursors drift over the headline on eased, non-repeating
     paths and periodically mark one of the outcome words.

     Explicitly simulated. No real users are represented, no counts are
     claimed, and the chip in the markup is labelled "illustrative".
     ====================================================================== */
  (function presence() {
    var layer = document.querySelector('.presence');
    var stage = document.querySelector('.hero-stage');
    if (!layer || !stage) return;

    var cursors = [].slice.call(layer.querySelectorAll('.cur'));
    var words = [].slice.call(document.querySelectorAll('[data-mk]'));
    if (!cursors.length) return;

    var box = { w: 0, h: 0 };
    function measure() {
      var r = layer.getBoundingClientRect();
      box.w = r.width; box.h = r.height;
      // Word rects, relative to the presence layer
      words.forEach(function (w) {
        var wr = w.getBoundingClientRect();
        w._pt = { x: wr.left - r.left + wr.width * 0.5, y: wr.top - r.top + wr.height * 0.5 };
      });
    }

    var agents = cursors.map(function (el, i) {
      return {
        el: el,
        x: Math.random() * 300, y: Math.random() * 160,
        fx: 0, fy: 0, t: 1, dur: 1, hold: 0,
        word: null, phase: i * 0.9
      };
    });

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function retarget(a) {
      // Roughly 45% of hops land on an outcome word and mark it up.
      var goWord = words.length && Math.random() < 0.45;
      if (goWord) {
        var w = words[(Math.random() * words.length) | 0];
        if (w._pt) {
          a.word = w;
          a.fx = w._pt.x + (Math.random() * 40 - 20);
          a.fy = w._pt.y + (Math.random() * 18 - 9);
        }
      } else {
        a.word = null;
        a.fx = box.w * (0.06 + Math.random() * 0.82);
        a.fy = box.h * (0.10 + Math.random() * 0.76);
      }
      a.sx = a.x; a.sy = a.y;
      a.dur = 1500 + Math.random() * 2200;   // never a fixed cadence
      a.t = 0;
    }

    var running = false, last = 0, raf = 0;

    function frame(now) {
      if (!running) return;
      var dt = last ? now - last : 16; last = now;

      for (var i = 0; i < agents.length; i++) {
        var a = agents[i];
        if (a.hold > 0) { a.hold -= dt; }
        else if (a.t >= 1) {
          if (a.word) {
            a.word.classList.add('marked');
            var mw = a.word;
            setTimeout(function () { mw.classList.remove('marked'); }, 1500);
            a.hold = 900 + Math.random() * 900;
          } else {
            a.hold = 200 + Math.random() * 700;
          }
          retarget(a);
        } else {
          a.t = Math.min(1, a.t + dt / a.dur);
          var e = easeInOutCubic(a.t);
          a.x = a.sx + (a.fx - a.sx) * e;
          a.y = a.sy + (a.fy - a.sy) * e;
          // A little organic wander so paths are never straight lines
          a.phase += dt * 0.0011;
          a.el.style.transform = 'translate3d(' +
            (a.x + Math.sin(a.phase) * 7).toFixed(1) + 'px,' +
            (a.y + Math.cos(a.phase * 0.8) * 5).toFixed(1) + 'px,0)';
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      measure(); agents.forEach(retarget);
      running = true; last = 0; layer.classList.add('live');
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false; cancelAnimationFrame(raf);
      layer.classList.remove('live');
      words.forEach(function (w) { w.classList.remove('marked'); });
    }

    // Only run while the hero is actually on screen.
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0.12 }).observe(stage);

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : (stage.getBoundingClientRect().bottom > 0 && start());
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(measure, 180);
    }, { passive: true });
  })();

  /* ======================================================================
     B. AMBIENT BACKGROUND MOTION
     Gradient meshes are CSS-animated; particles are generated here so the
     markup stays clean. Everything pauses via animation-play-state when the
     section leaves the viewport, so there is zero compositor work offscreen.
     ====================================================================== */
  (function ambient() {
    [].forEach.call(document.querySelectorAll('[data-ambient]'), function (layer) {
      var COUNT = window.innerWidth < 700 ? 16 : 30;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < COUNT; i++) {
        var p = document.createElement('span');
        p.className = 'p';
        p.style.left = (Math.random() * 100).toFixed(2) + '%';
        p.style.top = (72 + Math.random() * 34).toFixed(2) + '%';
        p.style.setProperty('--d', (Math.random() * 16).toFixed(2));
        p.style.setProperty('--s', (16 + Math.random() * 18).toFixed(2));
        p.style.setProperty('--o', (0.18 + Math.random() * 0.42).toFixed(2));
        p.style.setProperty('--dx', (Math.random() * 60 - 30).toFixed(1) + 'px');
        var sc = (0.6 + Math.random() * 1.5).toFixed(2);
        p.style.width = p.style.height = sc * 2.4 + 'px';
        frag.appendChild(p);
      }
      layer.appendChild(frag);
      layer.classList.add('paused');

      var host = layer.closest('.has-ambient') || layer.parentNode;
      new IntersectionObserver(function (es) {
        layer.classList.toggle('paused', !es[0].isIntersecting);
      }, { rootMargin: '120px' }).observe(host);

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) layer.classList.add('paused');
      });
    });
  })();

  /* ---- Header state, scroll progress, gutter chapter -------------------- */
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress span');
  var marks = [].slice.call(document.querySelectorAll('[data-mark]'));
  var gutter = document.querySelector('.gutter-num');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 24);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    if (gutter && marks.length) {
      var cur = marks[0];
      for (var i = 0; i < marks.length; i++) {
        if (marks[i].getBoundingClientRect().top < window.innerHeight * 0.45) cur = marks[i];
      }
      var n = cur.getAttribute('data-mark');
      if (gutter.textContent !== n) {
        gutter.textContent = n;
        gutter.classList.remove('bump'); void gutter.offsetWidth; gutter.classList.add('bump');
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---- Expanding vertical panels (touch + keyboard) --------------------- */
  var panels = [].slice.call(document.querySelectorAll('.panel'));
  panels.forEach(function (p) {
    function toggle() {
      var open = p.classList.contains('open');
      panels.forEach(function (o) { o.classList.remove('open'); o.setAttribute('aria-expanded', 'false'); });
      if (!open) { p.classList.add('open'); p.setAttribute('aria-expanded', 'true'); }
    }
    p.addEventListener('click', toggle);
    p.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ---- FAQ disclosure height ------------------------------------------- */
  [].forEach.call(document.querySelectorAll('.faq details'), function (d) {
    var body = d.querySelector('.answer-wrap');
    if (!body) return;
    if (d.open) body.style.height = 'auto';
    d.querySelector('summary').addEventListener('click', function (e) {
      e.preventDefault();
      if (d.open) {
        body.style.height = body.scrollHeight + 'px';
        requestAnimationFrame(function () { body.style.height = '0px'; });
        body.addEventListener('transitionend', function done() {
          d.open = false; body.style.height = '';
          body.removeEventListener('transitionend', done);
        });
      } else {
        d.open = true;
        var h = body.scrollHeight;
        body.style.height = '0px';
        requestAnimationFrame(function () { body.style.height = h + 'px'; });
        body.addEventListener('transitionend', function done() {
          body.style.height = 'auto';
          body.removeEventListener('transitionend', done);
        });
      }
    });
  });

  /* ---- Hero glow tracks the pointer ------------------------------------ */
  var hero = document.querySelector('.hero');
  if (hero && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 26).toFixed(2) + 'px');
      hero.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 26).toFixed(2) + 'px');
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--px', '0px'); hero.style.setProperty('--py', '0px');
    });
  }
})();
