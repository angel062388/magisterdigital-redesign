/* ==========================================================================
   MAGISTER DIGITAL — MOTION
   Signature effects: rule-draw + letterpress line reveal + split-flap mono.
   Ambient background motion + simulated collaborative presence in the hero.
   New 2026-08-05: founder modal + cobe dotted globe (lazy-loaded).

   Contract:
   - Nothing here is required for the page to be readable. The stylesheet
     carries an html:not(.js) failsafe and reveals fire on a 4s safety net.
   - prefers-reduced-motion disables every decorative effect but KEEPS the
     modal working (functional, not decoration).
   - Decorative layers are aria-hidden and pointer-events:none.
   - Presence cursors sit at z-index:1 — below the wrap (z-10) and CTA
     (z-20) — so they can never intercept clicks visually or by hit test.
   - Only transform and opacity are animated. Offscreen work is paused.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* ======================================================================
     FOUNDER MODAL — always available, works in reduced-motion.
     Data map lives here; markup is a single #founder-modal element in
     the HTML. Placeholder-flagged; no invented credentials.
     Full profile links go to /brian-hong/, /michael-merlino/, /dimitry-morgan/.
     ====================================================================== */
  (function modal() {
    var modal = document.getElementById('founder-modal');
    if (!modal) return;

    var titleEl  = modal.querySelector('[data-modal-title]');
    var roleEl   = modal.querySelector('[data-modal-role]');
    var avatarEl = modal.querySelector('[data-modal-avatar]');
    var bioEl    = modal.querySelector('[data-modal-bio]');
    var linkEl   = modal.querySelector('[data-modal-link]');

    var FOUNDERS = {
      brian: {
        name: 'Brian Hong',
        role: 'Co-founder & CEO',
        avatar: 'BH',
        bio: 'Bio pending sign-off. Full background, operator history and stake in the businesses Magister runs land on the /brian-hong/ profile page. No invented credentials appear here.',
        link: '/brian-hong/'
      },
      michael: {
        name: 'Michael Merlino',
        role: 'Co-founder · Strategy & AI systems',
        avatar: 'MM',
        bio: 'Bio pending sign-off. Positioning, strategy scope and AI systems responsibility land on the /michael-merlino/ profile page.',
        link: '/michael-merlino/'
      },
      dimitry: {
        name: 'Dimitry Morgan',
        role: 'Co-founder · Head of paid media',
        avatar: 'DM',
        bio: 'Bio pending sign-off. Paid-media leadership scope and the media accounts he directly runs land on the /dimitry-morgan/ profile page.',
        link: '/dimitry-morgan/'
      }
    };

    var trigger = null;

    function focusables() {
      return modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    }

    // Siblings we mark inert while the modal is open. Prevents screen-reader
    // and programmatic focus from escaping the dialog when aria-modal alone
    // isn't enforced by the browser/AT combination.
    function siblings() {
      return [
        document.querySelector('header.site-header'),
        document.getElementById('main'),
        document.querySelector('footer.site-footer'),
        document.querySelector('.ticker')
      ].filter(Boolean);
    }

    function open(key, from) {
      var data = FOUNDERS[key];
      if (!data) return;
      trigger = from;
      titleEl.textContent = data.name;
      roleEl.textContent = data.role;
      avatarEl.textContent = data.avatar;
      bioEl.textContent = data.bio;
      linkEl.setAttribute('href', data.link);
      modal.hidden = false;
      document.body.classList.add('modal-open');
      siblings().forEach(function (el) { el.setAttribute('inert', ''); });
      document.addEventListener('keydown', onKey);
      // Focus the close button first so the trap has an anchor.
      var closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      siblings().forEach(function (el) { el.removeAttribute('inert'); });
      document.removeEventListener('keydown', onKey);
      if (trigger && trigger.focus) trigger.focus();
      trigger = null;
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var els = focusables();
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    [].forEach.call(document.querySelectorAll('[data-modal]'), function (btn) {
      btn.addEventListener('click', function () { open(btn.getAttribute('data-modal'), btn); });
    });
    [].forEach.call(modal.querySelectorAll('[data-modal-close]'), function (el) {
      el.addEventListener('click', close);
    });
  })();

  /* ======================================================================
     COBE DOTTED GLOBE — lazy-loaded, gold on near-black.
     Loaded via dynamic ESM import from esm.sh only when the locations
     section enters the viewport. prefers-reduced-motion + low-power +
     WebGL failure all fall back to the static SVG map via .static class.
     ====================================================================== */
  (function globeBoot() {
    var mount = document.querySelector('[data-globe-mount]');
    var canvas = mount && mount.querySelector('[data-globe]');
    if (!mount || !canvas) return;

    // Reduced motion or no IntersectionObserver: show the SVG fallback.
    if (reduced || !canObserve) {
      mount.classList.add('static');
      return;
    }

    // Low-power capability check — honours the sec-lede promise that
    // low-power devices get the static map. If hardwareConcurrency reports
    // 2 or fewer cores, or the device explicitly reports Save-Data, skip
    // the WebGL globe entirely and serve the SVG fallback.
    var lowPower = (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2)
                 || (navigator.connection && navigator.connection.saveData === true);
    if (lowPower) {
      mount.classList.add('static');
      return;
    }

    var loaded = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || loaded) return;
        loaded = true;
        io.disconnect();
        loadGlobe(canvas, mount);
      });
    }, { rootMargin: '250px' });
    io.observe(mount);
  })();

  function loadGlobe(canvas, mount) {
    import('https://esm.sh/cobe@0.6.3').then(function (mod) {
      var createGlobe = mod.default || mod;
      var phi = 4.9;                    // start rotated so US faces the viewer
      var pointerInteracting = null;
      var pointerMovement = 0;
      var size = mount.clientWidth || 520;
      var paused = false;              // set true when locations section leaves the viewport

      // Ten US metros served, plus San Diego HQ (larger pin).
      var markers = [
        { location: [32.7157, -117.1611], size: 0.14 }, // San Diego HQ
        { location: [34.0522, -118.2437], size: 0.06 }, // Los Angeles
        { location: [37.3382, -121.8863], size: 0.06 }, // San Jose
        { location: [33.4484, -112.0740], size: 0.06 }, // Phoenix
        { location: [32.7767,  -96.7970], size: 0.06 }, // Dallas
        { location: [29.4241,  -98.4936], size: 0.06 }, // San Antonio
        { location: [29.7604,  -95.3698], size: 0.06 }, // Houston
        { location: [41.8781,  -87.6298], size: 0.06 }, // Chicago
        { location: [39.9526,  -75.1652], size: 0.06 }, // Philadelphia
        { location: [40.7128,  -74.0060], size: 0.06 }  // New York
      ];

      var globe;
      try {
        globe = createGlobe(canvas, {
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          width: size * 2,
          height: size * 2,
          phi: 0,
          theta: 0.32,
          dark: 1,
          diffuse: 1.15,
          mapSamples: 12000,
          mapBrightness: 5.5,
          baseColor:   [0.11, 0.115, 0.13],   // land dots
          markerColor: [0.831, 0.686, 0.216], // #D4AF37 gold
          glowColor:   [0.20, 0.16, 0.06],    // deep gold glow
          markers: markers,
          onRender: function (state) {
            // When the section is offscreen or the tab is hidden, skip the
            // phi delta so cobe paints the same frame — the browser can
            // then optimise away most of the render cost, avoiding a
            // permanent GPU/CPU load once the user scrolls past.
            if (!paused) {
              if (pointerInteracting !== null) {
                phi = pointerInteracting + pointerMovement / 200;
              } else {
                phi += 0.003; // slow auto-rotation
              }
            }
            state.phi = phi;
            state.width  = size * 2;
            state.height = size * 2;
          }
        });
      } catch (err) {
        mount.classList.add('static');
        return;
      }

      // Fade the canvas in so there is no flash from black
      canvas.style.opacity = '0';
      canvas.style.transition = 'opacity .6s ease';
      requestAnimationFrame(function () { canvas.style.opacity = '1'; });

      // WebGL context-loss recovery — tab backgrounding on mobile or a
      // driver reset can drop the GL context and leave the canvas blank.
      // Fall back to the static SVG map rather than showing an empty box.
      canvas.addEventListener('webglcontextlost', function (e) {
        e.preventDefault();
        mount.classList.add('static');
        canvas.style.opacity = '0';
      });

      // Drag to rotate. Pointer capture keeps the drag if the cursor leaves.
      // pointerMovement is reset on each pointerup/out so the decaying
      // inertia term never leaks from one drag gesture into the next.
      canvas.addEventListener('pointerdown', function (e) {
        pointerMovement = 0;
        pointerInteracting = phi;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      });
      canvas.addEventListener('pointerup', function () {
        pointerInteracting = null;
        pointerMovement = 0;
      });
      canvas.addEventListener('pointerout', function () {
        pointerInteracting = null;
        pointerMovement = 0;
      });
      canvas.addEventListener('pointermove', function (e) {
        if (pointerInteracting !== null) {
          pointerMovement = e.movementX * 2 + pointerMovement * 0.8;
        }
      });

      // Resize: rebuild size on window resize so the globe stays crisp.
      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          size = mount.clientWidth || size;
        }, 180);
      }, { passive: true });

      // Pause auto-rotation when the section leaves the viewport, and pause
      // on tab hide. Cobe has no external pause API, so we gate the phi
      // delta in onRender above — the same frame is painted while paused,
      // which the browser can optimise heavily.
      new IntersectionObserver(function (es) {
        paused = !es[0].isIntersecting;
      }, { rootMargin: '50px' }).observe(mount);

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) paused = true;
        else {
          var r = mount.getBoundingClientRect();
          paused = r.bottom < 0 || r.top > window.innerHeight;
        }
      });
    }).catch(function () {
      mount.classList.add('static');
    });
  }

  /* ======================================================================
     FUNCTIONAL — always run (never gated by reduced-motion)
     The Industries panel expand/collapse is functional, not decorative:
     without this handler, Medical and Legal panels cannot be opened by
     keyboard or touch. Any user who has prefers-reduced-motion enabled
     would otherwise be locked to whichever panel was open by default.
     ====================================================================== */
  (function panels() {
    var els = [].slice.call(document.querySelectorAll('.panel'));
    els.forEach(function (p) {
      function toggle() {
        var open = p.classList.contains('open');
        els.forEach(function (o) { o.classList.remove('open'); o.setAttribute('aria-expanded', 'false'); });
        if (!open) { p.classList.add('open'); p.setAttribute('aria-expanded', 'true'); }
      }
      p.addEventListener('click', toggle);
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  })();

  /* Reduced motion, or no observer support: show the finished state, stop
     all decorative effects. Modal, globe, and panels already handled above. */
  if (reduced || !canObserve) {
    root.classList.add('js', reduced ? 'reduced-motion' : 'no-io');
    [].forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
      el.classList.add('in');
    });
    [].forEach.call(document.querySelectorAll('[data-flap]'), function (el) {
      el.textContent = el.getAttribute('data-flap');
    });
    var pres = document.querySelector('.presence');
    if (pres) pres.style.display = 'none';
    [].forEach.call(document.querySelectorAll('[data-ambient]'), function (a) {
      a.classList.add('paused');
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
      a.dur = 1500 + Math.random() * 2200;
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
     section leaves the viewport.
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
