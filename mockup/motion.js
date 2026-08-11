/* ==========================================================================
   MAGISTER DIGITAL, MOTION
   Revision 4 (2026-08-05):
   - Metro click now swaps the globe for a Google Maps embed of that city,
     with a Show globe control to return. Iframe is built on first use and
     its src is dropped on close. Keyboard activation moves focus to the
     Show globe button; closing returns focus to the selected metro.
   - Hero H1 kinetic wipe removed (.lp / .mkw are gone from markup and CSS).
     Hero is now a two-column grid: content left, gold logo right, with the
     shared .ambient particle module drifting behind it.

   Revision 3 (2026-08-05):
   - Attribution line: fixed left-gutter SVG stroke that draws itself as the
     visitor scrolls (stroke-dashoffset from 1 to 0 tied to scroll progress).
     Four milestone nodes + mono labels light up as they're passed.
   - Metro click handlers wired IMMEDIATELY (not inside the cobe .then()), so
     clicking a metro always highlights + always feels responsive; globe
     rotation kicks in the moment cobe loads.
   - Globe re-tuned much brighter: dark 0.05, mapBrightness 9.5, diffuse 0.65,
     brighter base + brighter markers. Full sphere reads clearly, land dots
     visible against near-black background, gold pins pop.
   - onRender gives targetPhi priority over pointerInteracting, so a metro
     click can never be beaten by a stale pointer state.
   - Hero safety timeout tightened to 300ms so the letterpress reveal fires
     visibly on load even if the IntersectionObserver misses.
   - Panels: click still toggles (touch fallback + non-hover devices), and
     mouseenter/mouseleave now sync aria-expanded on hover-capable devices
     so screen-reader state stays truthful.
   - Modal: photo-rise animation is driven by CSS keyframes; JS just resets
     the animation on each open so it fires again for subsequent founders.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* ======================================================================
     FOUNDER MODAL: real Pexels-swap-for-real-photos, plus a repeating
     photo-rise entrance animation. always available, works in reduced-motion.
     ====================================================================== */
  (function modal() {
    var modal = document.getElementById('founder-modal');
    if (!modal) return;

    var titleEl  = modal.querySelector('[data-modal-title]');
    var roleEl   = modal.querySelector('[data-modal-role]');
    var photoEl  = modal.querySelector('[data-modal-photo]');
    var bioEl    = modal.querySelector('[data-modal-bio]');
    var flagEl   = modal.querySelector('[data-modal-flag]');
    var heroEl   = modal.querySelector('.modal-hero');
    var panelEl  = modal.querySelector('.modal-panel');

    var FOUNDERS = {
      brian: {
        name: 'Brian Hong',
        role: 'Co-founder & CEO',
        photo: 'img/brian-hong.jpg',
        alt: 'Brian Hong, Co-founder and CEO of Magister Digital',
        bio: 'Brian has been active in SEO since 2000 and running Infintech Designs since 2008. He co-owns TurnkeyRenovators, a multi-seven-figure construction operator, is a partner in a 13-location med spa chain, and founded Flowbots.ai and BigEasyData.ai to build the AI automation and data infrastructure his own companies needed first. Every playbook he ships to a Magister client was tested inside a business he already runs. His focus today is the AI-native SEO stack, machine-learning attribution, and the answer engines quietly rewriting how buyers find operators like his.'
      },
      michael: {
        name: 'Michael Merlino',
        role: 'Co-founder, Strategy & AI systems',
        photo: 'img/michael-merlino.jpg',
        alt: 'Michael Merlino, Co-founder of Magister Digital, Strategy and AI systems',
        bio: 'Michael calls himself the Godfather of Branded SEO, and the technical scope backs it up. Schema markup, canonical strategy, Core Web Vitals, negative-keyword architecture, the plumbing under the ranking and increasingly the plumbing under the answer. At Magister he owns positioning, strategy and AI systems, which in 2026 means the same technical rigor pointed at large language models and the answer engines quietly replacing the ten-blue-links page. His job is making sure clients live in the retrieval layer AI tools actually cite, not the pile of AI slop they scroll past.'
      },
      dimitry: {
        name: 'Dimitry Morgan',
        role: 'Co-founder, Head of paid media',
        photo: 'img/dimitry-morgan.png',
        alt: 'Dimitry Morgan, Co-founder of Magister Digital, Head of paid media',
        bio: 'Dimitry ran service calls before he ran ad accounts. Fifteen years inside Google Ads, Performance Max and Meta after the HVAC-truck years give him field context most media buyers do not have. He knows what a booked job is worth on a Saturday in July and what idle techs cost on a Wednesday in February, so at Magister he does not chase cost-per-click as the metric. Cost-per-booked-appointment is the number. He runs the machine-learning attribution work that ties every campaign back to the calendar it should have filled.'
      }
    };

    var trigger = null;

    function siblings() {
      return [
        document.querySelector('header.site-header'),
        document.getElementById('main'),
        document.querySelector('footer.site-footer'),
        document.querySelector('.ticker'),
        document.querySelector('.attribution')
      ].filter(Boolean);
    }

    function focusables() {
      return modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    }

    function restartAnimation(el) {
      if (!el) return;
      var a = el.style.animation;
      el.style.animation = 'none';
      // Force reflow so removing + re-adding registers as a fresh animation
      void el.offsetWidth;
      el.style.animation = '';
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
      if (flagEl) {
        if (data.pending) flagEl.removeAttribute('hidden');
        else flagEl.setAttribute('hidden', '');
      }
      modal.hidden = false;
      document.body.classList.add('modal-open');
      siblings().forEach(function (el) { el.setAttribute('inert', ''); });
      // Restart the CSS entrance animations so the photo-rise + panel-fade
      // fire on every open, not only the first.
      restartAnimation(heroEl);
      restartAnimation(panelEl);
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

    // Card-level click delegate: clicking anywhere on the founder card
    // (not just the small Read-profile button) triggers the modal open,
    // matching Beth's 'clickable card' spec. Skipped when the click
    // target is already the inner button so we don't fire twice, and
    // when the target is a link/input the user meant to reach directly.
    // SERVICE ROWS: the row used to be one big anchor, which meant the new
    // Book a call button would have been a link nested inside a link. The row
    // is a plain container now and the service name carries the real link, so
    // clicking anywhere else on the row is restored here. Clicks that land on
    // a genuine control are left alone so the button still does its own job.
    [].forEach.call(document.querySelectorAll('[data-svc-row]'), function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('a, button, input, textarea, select, label')) return;
        var href = row.getAttribute('data-href');
        if (href) window.location.href = href;
      });
    });

    [].forEach.call(document.querySelectorAll('[data-card-modal]'), function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('button, a, input, textarea, select, label')) return;
        var inner = card.querySelector('[data-modal]');
        if (inner) inner.click();
      });
    });
  })();

  /* ======================================================================
     METRO BUTTONS: click handlers wired IMMEDIATELY (not inside the cobe
     .then), so clicking a metro always highlights + always feels
     responsive. If the globe loads later, its rotation function is
     assigned to globeState.rotateTo — subsequent clicks then rotate.
     ====================================================================== */
  // pendingLon remembers the last metro clicked before the globe finished
  // loading; when loadGlobe assigns globeState.rotateTo, it replays the
  // pending selection so an early click still ends up rotating the globe.
  var globeState = { targetPhi: null, currentPhi: null, rotateTo: null, pendingLon: null,
                     covered: false };

  /* ======================================================================
     HERO LOGO, REAL TIME RENDER
     Instead of replaying a fixed keyframe, this writes the logo's tilt,
     lift and specular highlight every frame from live pointer position.
     The gold reads as metal catching light: move the cursor and the
     highlight sweeps to follow it, and the plate tilts away from it.

     Values are eased toward their targets each frame rather than snapped,
     so the motion keeps weight. When the pointer is idle or absent, a slow
     time-based drift takes over so the mark is never completely static.

     Skipped entirely under prefers-reduced-motion, where the CSS keyframe
     fallback is also disabled and the logo simply sits still.
     ====================================================================== */
  (function liveLogo() {
    if (reduced) return;
    var stage = document.querySelector('[data-logo-stage]');
    var hero = stage && stage.closest('.hero');
    if (!stage || !hero) return;

    var sheen = stage.querySelector('.hero-logo-sheen');
    document.documentElement.classList.add('logo-live');

    // cur = what is on screen, tgt = where it wants to be.
    var cur = { rx: 0, ry: 0, fy: 0, sx: -80, lift: 0 };
    var tgt = { rx: 0, ry: 0, fy: 0, sx: -80, lift: 0 };
    // Pointer contribution, held separately so it can be ADDED to the
    // automatic motion rather than replacing it, and decayed back to zero
    // when the pointer leaves.
    var p = { ry: 0, rx: 0, fy: 0, sx: 0, active: 0 };
    var pointerActive = false, running = false, t0 = null;

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      // -1 to 1 across the hero, so the logo reacts to the whole area
      var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      var ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      p.ry = nx * 11;          // yaw follows the cursor horizontally
      p.rx = -ny * 8;          // pitch is inverted so it leans toward you
      p.fy = ny * -5;
      p.sx = nx * 90;          // nudges the highlight toward the cursor
      pointerActive = true;
    }, { passive: true });

    hero.addEventListener('pointerleave', function () { pointerActive = false; });

    function frame(now) {
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;

      // AUTOMATIC MOTION. This always runs, on every frame, whether or not
      // a pointer is anywhere near the page: a slow figure-of-eight tilt,
      // a rise and fall, and a highlight that sweeps the mark roughly every
      // six seconds. The logo animates on its own with no input at all.
      var autoRy = Math.sin(t * 0.55) * 15;
      var autoRx = Math.sin(t * 0.41) * 9;
      var autoFy = Math.sin(t * 0.65) * 18;
      var cycle  = (t * 0.25) % 1;
      var autoSx = cycle < 0.45 ? -80 + (cycle / 0.45) * 265 : 185;

      // Pointer influence decays to zero after it leaves, so the automatic
      // motion is never left frozen at wherever the cursor happened to be.
      p.active += ((pointerActive ? 1 : 0) - p.active) * 0.05;

      tgt.ry = autoRy + p.ry * p.active;
      tgt.rx = autoRx + p.rx * p.active;
      tgt.fy = autoFy + p.fy * p.active;
      tgt.sx = autoSx + p.sx * p.active;
      tgt.lift = 0.5 + Math.sin(t * 0.5) * 0.5;

      var k = 0.075;
      cur.rx += (tgt.rx - cur.rx) * k;
      cur.ry += (tgt.ry - cur.ry) * k;
      cur.fy += (tgt.fy - cur.fy) * k;
      cur.lift += (tgt.lift - cur.lift) * k;
      cur.sx += (tgt.sx - cur.sx) * (pointerActive ? 0.12 : 0.06);

      stage.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
      stage.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
      stage.style.setProperty('--fy', cur.fy.toFixed(2) + 'px');
      stage.style.setProperty('--lift', cur.lift.toFixed(3));
      if (sheen) sheen.style.backgroundPosition = cur.sx.toFixed(1) + '% 0';

      if (running) requestAnimationFrame(frame);
    }

    // Only render while the hero is actually on screen, and never while the
    // tab is hidden. A per frame loop left running off screen is waste.
    function start() { if (!running) { running = true; t0 = null; requestAnimationFrame(frame); } }
    function stop()  { running = false; }

    var visible = false;
    if (canObserve) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }, { rootMargin: '80px' }).observe(hero);
    } else { visible = true; start(); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (visible) start();
    });
  })();

  /* ======================================================================
     METRO MAP: clicking a metro replaces the globe with a Google Maps
     embed of that city. The iframe is built on first use, so a visitor
     who never clicks a metro never loads anything from Google.

     Runs for everyone, including prefers-reduced-motion and low-power
     devices. A map embed is not an animation, and withholding it there
     would leave those visitors clicking metros with nothing happening.
     What the fallback still governs is what "Show globe" returns TO: on
     those devices the canvas never boots, so it returns to the static
     SVG, exactly as before.
     ====================================================================== */
  var locMap = (function () {
    var noop = { show: function () {}, hide: function () {}, remember: function () {} };
    var wrap = document.querySelector('[data-globe-mount]');
    var host = wrap && wrap.querySelector('[data-loc-frame]');
    var back = wrap && wrap.querySelector('[data-loc-globe-back]');
    if (!wrap || !host || !back) return noop;

    var status = document.querySelector('[data-loc-status]');
    var frame = null;
    var lastMetro = null;

    function show(name, lat, lon, moveFocus) {
      if (!frame) {
        frame = document.createElement('iframe');
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        host.appendChild(frame);
      }
      frame.setAttribute('title', 'Map of ' + name);
      frame.src = 'https://maps.google.com/maps?q=' + lat + ',' + lon + '&z=10&output=embed';
      wrap.classList.add('map-on');
      globeState.covered = true;
      if (status) status.textContent = 'Showing map of ' + name +
        '. Use the show globe button to return to the globe view.';
      // Only pull focus when the metro was activated from the keyboard
      // (Enter and Space report event.detail 0). The Show globe button sits
      // BEFORE the metro list in the DOM, so without this a keyboard user
      // would have to shift-tab back through the list to find it. A mouse
      // user keeps their focus where it was.
      // Deferred a frame on purpose: the button is visibility:hidden until
      // .map-on lands, and calling focus() in the same tick as the class
      // add silently does nothing because the style has not recalculated.
      if (moveFocus) requestAnimationFrame(function () { back.focus(); });
    }

    function hide() {
      if (!wrap.classList.contains('map-on')) return;
      wrap.classList.remove('map-on');
      globeState.covered = false;
      // Drop the src so the embed stops running while it is not visible.
      if (frame) frame.removeAttribute('src');
      if (status) status.textContent = 'Map closed. Globe view restored.';
      if (lastMetro) lastMetro.focus();
    }

    back.addEventListener('click', hide);
    return { show: show, hide: hide, remember: function (el) { lastMetro = el; } };
  })();

  (function wireMetros() {
    var metros = [].slice.call(document.querySelectorAll('.loc-metro'));
    if (!metros.length) return;
    metros.forEach(function (btn) { btn.setAttribute('aria-pressed', 'false'); });
    metros.forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        metros.forEach(function (m) {
          m.classList.remove('active');
          m.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        var lat = parseFloat(btn.getAttribute('data-lat'));
        var lon = parseFloat(btn.getAttribute('data-long'));
        if (isNaN(lat) || isNaN(lon)) return;

        // Rotate the globe underneath as before, so returning to the globe
        // shows the metro that is selected rather than a stale position.
        globeState.pendingLon = lon;
        if (typeof globeState.rotateTo === 'function') globeState.rotateTo(lon);

        locMap.remember(btn);
        locMap.show(btn.textContent.trim(), lat, lon, ev && ev.detail === 0);
      });
    });
  })();

  /* ======================================================================
     COBE GLOBE, brighter tuning + always-live click-rotate.
     ====================================================================== */
  (function globeBoot() {
    var mount = document.querySelector('[data-globe-mount]');
    var canvas = mount && mount.querySelector('[data-globe]');
    if (!mount || !canvas) return;

    if (reduced || !canObserve) { mount.classList.add('static'); return; }

    var lowPower = (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2)
                 || (navigator.connection && navigator.connection.saveData === true);
    if (lowPower) { mount.classList.add('static'); return; }

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

      // Calibration: BASE_PHI + (BASE_LON - target_lon) * (π/180).
      // Sign convention: increasing phi rotates the sphere so a westward
      // longitude comes to the front. For a US-centred base, moving east
      // (less-negative longitude) subtracts phi, moving west adds phi.
      var BASE_LON = -100;     // rough US centre; SD click stays close to home
      var BASE_PHI = 4.6;
      function targetPhiFor(lon) {
        return BASE_PHI + (BASE_LON - lon) * (Math.PI / 180);
      }

      var phi = BASE_PHI;
      globeState.currentPhi = phi;
      var pointerInteracting = null;
      var pointerMovement = 0;
      var size = mount.clientWidth || 520;
      // Buffer must be sized in DEVICE pixels. This was hardcoded to size*2,
      // which is only correct on a 2x display: on an ordinary 1x monitor it
      // built a buffer twice the CSS box, so the sphere drew at double scale
      // and only a corner of it was ever visible.
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
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
          devicePixelRatio: dpr,
          width: size * dpr,
          height: size * dpr,
          phi: 0,
          theta: 0.28,
          // MUCH brighter: dark shading almost off, map dots turned up
          // hard so the full sphere reads clearly against near-black.
          dark: 0.05,
          diffuse: 0.65,
          mapSamples: 16000,
          mapBrightness: 9.5,
          baseColor:   [0.22, 0.23, 0.26],
          markerColor: [1.0,  0.85, 0.28],
          glowColor:   [0.42, 0.32, 0.09],
          markers: markers,
          onRender: function (state) {
            // globeState.covered is set while the metro map is over the
            // canvas. The viewport IntersectionObserver below cannot catch
            // that case: the section is still on screen, so no IO event
            // fires and the sphere would keep spinning behind an opaque
            // map for as long as the visitor leaves it open.
            if (paused || globeState.covered) { state.phi = phi; return; }
            // targetPhi wins over pointer + auto-rotation: a metro click
            // can never be silently beaten by a stale drag state.
            if (globeState.targetPhi !== null) {
              var delta = globeState.targetPhi - phi;
              if (delta > Math.PI)  delta -= 2 * Math.PI;
              if (delta < -Math.PI) delta += 2 * Math.PI;
              if (Math.abs(delta) < 0.006) {
                phi = globeState.targetPhi;
                globeState.targetPhi = null;
              } else {
                phi += delta * 0.09;
              }
            } else if (pointerInteracting !== null) {
              phi = pointerInteracting + pointerMovement / 200;
            } else {
              phi += 0.003;
            }
            globeState.currentPhi = phi;
            state.phi = phi;
            state.width  = size * dpr;
            state.height = size * dpr;
          }
        });
      } catch (err) {
        mount.classList.add('static');
        return;
      }

      // Register rotate function so any prior/future metro click routes
      // rotation through the running globe. If a click landed before the
      // globe finished loading, replay that selection now.
      globeState.rotateTo = function (lon) {
        globeState.targetPhi = targetPhiFor(lon);
      };
      if (globeState.pendingLon !== null) {
        globeState.rotateTo(globeState.pendingLon);
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
        // A drag interrupts any in-flight metro-click rotation, so control
        // hands over cleanly and the globe never snaps to a stale phi
        // when the target-seek lerp finishes mid-drag.
        globeState.targetPhi = null;
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
    });
  }

  /* ======================================================================
     INDUSTRIES PANELS
     Touch/click toggle (fallback path). CSS handles hover-open + focus-open
     on hover-capable devices. JS mouseenter/leave also sync aria-expanded
     on those devices so SR state stays truthful.
     ====================================================================== */
  (function panels() {
    var hasHover = window.matchMedia('(hover: hover)').matches;
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
      if (hasHover) {
        p.addEventListener('mouseenter', function () { p.setAttribute('aria-expanded', 'true'); });
        p.addEventListener('mouseleave', function () {
          if (!p.classList.contains('open')) p.setAttribute('aria-expanded', 'false');
        });
        p.addEventListener('focus', function () { p.setAttribute('aria-expanded', 'true'); });
        p.addEventListener('blur', function () {
          if (!p.classList.contains('open')) p.setAttribute('aria-expanded', 'false');
        });
      }
    });
  })();

  /* Reduced motion, or no observer support: show finished state, stop
     decorative effects. Modal, globe boot, panels already handled above. */
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

  /* Reveals: fire on IO, plus a 300ms safety timeout that force-reveals
     any [data-reveal] currently in the viewport. That guarantees the
     rule-draw and stagger animations always fire on load, even if the
     IntersectionObserver missed because the section was already in view.
     (The hero letterpress wipe this originally also covered was removed
     in revision 4; the H1 renders statically now.) */
  observe('[data-reveal]', function (el) {
    [].forEach.call(el.querySelectorAll('[data-stagger]'), function (kid, i) {
      kid.style.setProperty('--i', i);
    });
    el.classList.add('in');
  });
  setTimeout(function () {
    [].forEach.call(document.querySelectorAll('[data-reveal]:not(.in)'), function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('in');
    });
  }, 300);

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
      // Travel distance in PIXELS, measured from the layer itself. A
      // percentage here would resolve against each particle's own 1.4px
      // to 5px height and the drift would be invisible.
      var layerH = Math.round(layer.getBoundingClientRect().height) || window.innerHeight;
      var rise = '-' + Math.round(layerH * 1.15) + 'px';
      for (var i = 0; i < COUNT; i++) {
        var p = document.createElement('span');
        p.className = 'p';
        p.style.left = (Math.random() * 100).toFixed(2) + '%';
        p.style.top = (72 + Math.random() * 34).toFixed(2) + '%';
        p.style.setProperty('--d', (Math.random() * 16).toFixed(2));
        p.style.setProperty('--s', (16 + Math.random() * 18).toFixed(2));
        p.style.setProperty('--o', (0.18 + Math.random() * 0.42).toFixed(2));
        p.style.setProperty('--dx', (Math.random() * 60 - 30).toFixed(1) + 'px');
        p.style.setProperty('--dy', rise);
        var sc = (0.6 + Math.random() * 1.5).toFixed(2);
        p.style.width = p.style.height = sc * 2.4 + 'px';
        frag.appendChild(p);
      }
      layer.appendChild(frag);
      layer.classList.add('paused');

      var host = layer.closest('.has-ambient') || layer.parentNode;
      var inView = false;
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        layer.classList.toggle('paused', !inView);
      }, { rootMargin: '120px' }).observe(host);

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) layer.classList.add('paused');
        else layer.classList.toggle('paused', !inView);
      });
    });
  })();

  /* ======================================================================
     ATTRIBUTION LINE: fixed left-gutter SVG line self-drawing on scroll.
     stroke-dashoffset goes from 1 to 0 as page scroll progresses 0 to 1.
     Milestone circles + labels light up as their normalized scroll
     position is passed.
     ====================================================================== */
  (function attribution() {
    var line = document.querySelector('.attr-line');
    if (!line) return;
    var nodes = [].slice.call(document.querySelectorAll('.attribution [data-node]'));

    function tick() {
      var scrolled = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      // On a non-scrollable page (max <= 0) treat progress as fully drawn,
      // so the line renders complete instead of staying invisible.
      var p = max > 0 ? Math.min(scrolled / max, 1) : 1;
      line.style.strokeDashoffset = (1 - p).toFixed(4);
      nodes.forEach(function (n) {
        var at = parseFloat(n.getAttribute('data-node')) || 0;
        n.classList.toggle('lit', p >= at);
      });
    }
    // Also fire once on load so the line has an initial state
    tick();
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(function () { tick(); ticking = false; }); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
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

  /* FAQ disclosure height, race-guarded */
  [].forEach.call(document.querySelectorAll('.faq details'), function (d) {
    var body = d.querySelector('.answer-wrap');
    if (!body) return;
    if (d.open) body.style.height = 'auto';
    var animating = false;
    d.querySelector('summary').addEventListener('click', function (e) {
      e.preventDefault();
      if (animating) return;
      animating = true;
      if (d.open) {
        body.style.height = body.scrollHeight + 'px';
        requestAnimationFrame(function () { body.style.height = '0px'; });
        body.addEventListener('transitionend', function done() {
          d.open = false; body.style.height = '';
          body.removeEventListener('transitionend', done);
          animating = false;
        });
      } else {
        d.open = true;
        var h = body.scrollHeight;
        body.style.height = '0px';
        requestAnimationFrame(function () { body.style.height = h + 'px'; });
        body.addEventListener('transitionend', function done() {
          body.style.height = 'auto';
          body.removeEventListener('transitionend', done);
          animating = false;
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
