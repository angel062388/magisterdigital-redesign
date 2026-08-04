/* ==========================================================================
   MAGISTER DIGITAL, MOTION
   Revision 2026-08-05 (round 2):
   - Presence cursors + collaborative simulation REMOVED per Beth's Aug 5
     second-round spec. Hero now carries itself with rule-draw + letterpress
     reveal + ambient motion + hero-glow-follows-pointer.
   - Founder modal now populates a Pexels headshot instead of initials.
   - Cobe globe uses lower dark shading + higher map brightness so the full
     sphere renders visibly rather than a lit hemisphere.
   - Metros in Locations are clickable buttons. Click sets a targetPhi and
     onRender lerps toward it. Active metro gets a .active highlight class.
   - Industries panels all default closed. Panel click handler runs above
     the reduced-motion guard so it works for reduced-motion users too.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* ======================================================================
     FOUNDER MODAL (always available, works in reduced-motion)
     Data map lives here; markup is a single #founder-modal element.
     Placeholder-flagged photos + bios; no invented credentials.
     ====================================================================== */
  (function modal() {
    var modal = document.getElementById('founder-modal');
    if (!modal) return;

    var titleEl  = modal.querySelector('[data-modal-title]');
    var roleEl   = modal.querySelector('[data-modal-role]');
    var photoEl  = modal.querySelector('[data-modal-photo]');
    var bioEl    = modal.querySelector('[data-modal-bio]');
    var linkEl   = modal.querySelector('[data-modal-link]');

    var FOUNDERS = {
      brian: {
        name: 'Brian Hong',
        role: 'Co-founder & CEO',
        photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Placeholder headshot for Brian Hong',
        bio: 'Bio pending sign-off. Full operator background, businesses held under stake, and CEO scope land on the /brian-hong/ profile page. No invented credentials appear here.',
        link: '/brian-hong/'
      },
      michael: {
        name: 'Michael Merlino',
        role: 'Co-founder, Strategy & AI systems',
        photo: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Placeholder headshot for Michael Merlino',
        bio: 'Bio pending sign-off. Positioning, strategy scope and AI systems responsibility land on the /michael-merlino/ profile page.',
        link: '/michael-merlino/'
      },
      dimitry: {
        name: 'Dimitry Morgan',
        role: 'Co-founder, Head of paid media',
        photo: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Placeholder headshot for Dimitry Morgan',
        bio: 'Bio pending sign-off. Paid-media leadership scope and the accounts he directly runs land on the /dimitry-morgan/ profile page.',
        link: '/dimitry-morgan/'
      }
    };

    var trigger = null;

    function siblings() {
      return [
        document.querySelector('header.site-header'),
        document.getElementById('main'),
        document.querySelector('footer.site-footer'),
        document.querySelector('.ticker')
      ].filter(Boolean);
    }

    function focusables() {
      return modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    }

    function open(key, from) {
      var data = FOUNDERS[key];
      if (!data) return;
      trigger = from;
      titleEl.textContent = data.name;
      roleEl.textContent = data.role;
      photoEl.setAttribute('src', data.photo);
      photoEl.setAttribute('alt', data.alt);
      bioEl.textContent = data.bio;
      linkEl.setAttribute('href', data.link);
      modal.hidden = false;
      document.body.classList.add('modal-open');
      siblings().forEach(function (el) { el.setAttribute('inert', ''); });
      document.addEventListener('keydown', onKey);
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
     COBE DOTTED GLOBE
     Loaded via dynamic ESM import from esm.sh only when the locations
     section enters the viewport. prefers-reduced-motion + low-power +
     WebGL failure all fall back to the static SVG map.

     Metros are click-targets: clicking a button sets a target phi that
     onRender lerps toward. When reached, auto-rotation resumes and the
     clicked metro carries a .active highlight class.
     ====================================================================== */
  var globeState = { targetPhi: null, currentPhi: null };

  (function globeBoot() {
    var mount = document.querySelector('[data-globe-mount]');
    var canvas = mount && mount.querySelector('[data-globe]');
    if (!mount || !canvas) return;

    // Reduced motion or no IntersectionObserver: show the SVG fallback,
    // but still wire the metro buttons so clicking one visually confirms
    // the interaction (highlight only; no globe rotation).
    if (reduced || !canObserve) {
      mount.classList.add('static');
      wireMetrosStatic();
      return;
    }

    var lowPower = (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2)
                 || (navigator.connection && navigator.connection.saveData === true);
    if (lowPower) {
      mount.classList.add('static');
      wireMetrosStatic();
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

  // Highlight-only handler used when the globe won't run (reduced motion,
  // low power, WebGL failure). Metro buttons still get visual feedback so
  // clicking is not silently dead.
  function wireMetrosStatic() {
    var metros = [].slice.call(document.querySelectorAll('.loc-metro'));
    metros.forEach(function (btn) {
      btn.addEventListener('click', function () {
        metros.forEach(function (m) { m.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  function loadGlobe(canvas, mount) {
    import('https://esm.sh/cobe@0.6.3').then(function (mod) {
      var createGlobe = mod.default || mod;

      // SD-centred start phi. Calibrated empirically: at this phi the US
      // faces the viewer with San Diego near the front-left quarter.
      var BASE_LON = -117.1611;      // San Diego
      var BASE_PHI = 4.9;
      // Given cobe's phi = 4.9 shows US, delta per degree ≈ π/180.
      // Rotation direction: moving target_lon EAST (less negative)
      // requires DECREASING phi. So targetPhi = BASE_PHI + (BASE_LON - target_lon) * π/180.
      function targetPhiFor(lon) {
        return BASE_PHI + (BASE_LON - lon) * (Math.PI / 180);
      }

      var phi = BASE_PHI;
      globeState.currentPhi = phi;
      var pointerInteracting = null;
      var pointerMovement = 0;
      var size = mount.clientWidth || 520;
      var paused = false;

      var markers = [
        { location: [32.7157, -117.1611], size: 0.14 },
        { location: [34.0522, -118.2437], size: 0.06 },
        { location: [37.3382, -121.8863], size: 0.06 },
        { location: [33.4484, -112.0740], size: 0.06 },
        { location: [32.7767,  -96.7970], size: 0.06 },
        { location: [29.4241,  -98.4936], size: 0.06 },
        { location: [29.7604,  -95.3698], size: 0.06 },
        { location: [41.8781,  -87.6298], size: 0.06 },
        { location: [39.9526,  -75.1652], size: 0.06 },
        { location: [40.7128,  -74.0060], size: 0.06 }
      ];

      var globe;
      try {
        globe = createGlobe(canvas, {
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          width: size * 2,
          height: size * 2,
          phi: 0,
          theta: 0.28,
          // Dark shading reduced from 1 to 0.3 so the full sphere is
          // visible instead of only the lit hemisphere. Map brightness
          // raised so land dots read clearly on a near-black background.
          dark: 0.3,
          diffuse: 0.9,
          mapSamples: 14000,
          mapBrightness: 6.5,
          baseColor:   [0.13, 0.135, 0.15],
          markerColor: [0.831, 0.686, 0.216],
          glowColor:   [0.20, 0.16, 0.06],
          markers: markers,
          onRender: function (state) {
            if (!paused) {
              if (pointerInteracting !== null) {
                phi = pointerInteracting + pointerMovement / 200;
                globeState.targetPhi = null;
              } else if (globeState.targetPhi !== null) {
                var delta = globeState.targetPhi - phi;
                // Take the shortest way around the sphere
                if (delta > Math.PI)  delta -= 2 * Math.PI;
                if (delta < -Math.PI) delta += 2 * Math.PI;
                if (Math.abs(delta) < 0.006) {
                  phi = globeState.targetPhi;
                  globeState.targetPhi = null;
                } else {
                  phi += delta * 0.07;
                }
              } else {
                phi += 0.003;
              }
            }
            globeState.currentPhi = phi;
            state.phi = phi;
            state.width  = size * 2;
            state.height = size * 2;
          }
        });
      } catch (err) {
        mount.classList.add('static');
        wireMetrosStatic();
        return;
      }

      canvas.style.opacity = '0';
      canvas.style.transition = 'opacity .6s ease';
      requestAnimationFrame(function () { canvas.style.opacity = '1'; });

      canvas.addEventListener('webglcontextlost', function (e) {
        e.preventDefault();
        mount.classList.add('static');
        canvas.style.opacity = '0';
      });

      canvas.addEventListener('pointerdown', function (e) {
        pointerMovement = 0;
        pointerInteracting = phi;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      });
      canvas.addEventListener('pointerup', function () {
        pointerInteracting = null; pointerMovement = 0;
      });
      canvas.addEventListener('pointerout', function () {
        pointerInteracting = null; pointerMovement = 0;
      });
      canvas.addEventListener('pointermove', function (e) {
        if (pointerInteracting !== null) {
          pointerMovement = e.movementX * 2 + pointerMovement * 0.8;
        }
      });

      // Wire the metro buttons to rotate the globe + highlight themselves.
      var metros = [].slice.call(document.querySelectorAll('.loc-metro'));
      metros.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var lon = parseFloat(btn.getAttribute('data-long'));
          if (isNaN(lon)) return;
          globeState.targetPhi = targetPhiFor(lon);
          metros.forEach(function (m) { m.classList.remove('active'); });
          btn.classList.add('active');
        });
      });

      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { size = mount.clientWidth || size; }, 180);
      }, { passive: true });

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
      wireMetrosStatic();
    });
  }

  /* ======================================================================
     FUNCTIONAL: always run (never gated by reduced-motion)
     Industries panel expand/collapse. Without this, Medical and Legal
     cannot be opened by keyboard or touch when prefers-reduced-motion
     is enabled.
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

  /* Reveals */
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

  /* Split-flap mono metadata */
  var FLAP = '0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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

  /* AMBIENT BACKGROUND MOTION */
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

  /* Header state, scroll progress, gutter chapter */
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

  /* FAQ disclosure height */
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

  /* Hero glow tracks the pointer */
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
