
// existing nav + animation behavior (fixed)
document.addEventListener('DOMContentLoaded', () => {
  // --- Mobile nav toggle ---
  const navToggle = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('mobileNavMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isExpanded));
      navMenu.classList.toggle('scale-y-0');
      navMenu.classList.toggle('scale-y-100');
    });
  }

  // --- Scroll animation setup ---
  const animatedSections = document.querySelectorAll('.section-animate');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  animatedSections.forEach(s => observer.observe(s));

  // --- Background dimming ---
  const trafficBG = document.getElementById('traffic-bg');
  if (trafficBG) {
    let isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isTouch) {
      document.querySelectorAll('a, button, input, textarea').forEach(el => {
        el.addEventListener('mouseenter', () => { trafficBG.style.opacity = '0.85'; });
        el.addEventListener('mouseleave', () => { trafficBG.style.opacity = '1'; });
      });
    }
  }

  // --- Accessibility for motion reduction ---
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('#traffic-bg .orb').forEach(o => { o.style.transition = 'none'; });
  }
});


    // orbs controller (same as before)
    (function() {
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
      const red = document.getElementById('orb-red');
      const green = document.getElementById('orb-green');
      const yellow = document.getElementById('orb-yellow');
      const orbs = [red, green, yellow];
      const base = orbs.map(o => ({ el:o, left: parseFloat(o.dataset.baseLeft||o.style.left||'50'), top: parseFloat(o.dataset.baseTop||o.style.top||'50') }));
      const timings = { spreadDuration:14000, roamDuration:14000, settleDuration:14000, pauseBetweenCycles:1200 };
      function wait(ms){return new Promise(r=>setTimeout(r,ms));}
      function setPosSimple(orbObj,leftPct,topPct){ orbObj.el.style.left = leftPct+'%'; orbObj.el.style.top = topPct+'%'; }
      function computeRoamWaypoints() {
        const bottomLimit = 86;
        return [
          [{ left: Math.max(6, base[0].left - 18), top: Math.min(bottomLimit, base[0].top + 14) }, { left: Math.max(6, base[0].left - 34), top: Math.min(bottomLimit, base[0].top + 26) }],
          [{ left: Math.min(94, base[1].left + 8), top: Math.min(bottomLimit, base[1].top + 24) }, { left: Math.max(12, base[1].left - 10), top: Math.min(bottomLimit, base[1].top + 34) }],
          [{ left: Math.min(94, base[2].left + 22), top: Math.min(bottomLimit, base[2].top + 18) }, { left: Math.min(94, base[2].left + 36), top: Math.min(bottomLimit, base[2].top + 30) }]
        ];
      }
      async function runCycle() {
        const roamWaypoints = computeRoamWaypoints();
        setPosSimple(base[0], roamWaypoints[0][0].left, roamWaypoints[0][0].top);
        await wait(420);
        setPosSimple(base[1], roamWaypoints[1][0].left, roamWaypoints[1][0].top);
        await wait(420);
        setPosSimple(base[2], roamWaypoints[2][0].left, roamWaypoints[2][0].top);
        await wait(timings.spreadDuration + 220);
        setPosSimple(base[0], roamWaypoints[0][1].left, roamWaypoints[0][1].top);
        await wait(320);
        setPosSimple(base[1], roamWaypoints[1][1].left, roamWaypoints[1][1].top);
        await wait(320);
        setPosSimple(base[2], roamWaypoints[2][1].left, roamWaypoints[2][1].top);
        await wait(timings.roamDuration + 400);
        setPosSimple(base[0], base[0].left, base[0].top);
        await wait(200);
        setPosSimple(base[1], base[1].left, base[1].top);
        await wait(200);
        setPosSimple(base[2], base[2].left, base[2].top);
        await wait(timings.settleDuration + timings.pauseBetweenCycles);
      }
      let running = true;
      async function loop(){ await wait(420); while(running) await runCycle(); }
      setTimeout(()=>{ base.forEach(b=>{ b.el.style.left = b.left+'%'; b.el.style.top = b.top+'%'; }); loop(); }, 220);
      document.addEventListener('visibilitychange', ()=>{ running = !document.hidden; if (running) loop();});
      let resizeTimer = null;
      window.addEventListener('resize', ()=>{ clearTimeout(resizeTimer); resizeTimer = setTimeout(()=>{ base.forEach(b=>{ const dsLeft = parseFloat(b.el.dataset.baseLeft || b.el.style.left || b.left); const dsTop = parseFloat(b.el.dataset.baseTop || b.el.style.top || b.top); b.left = dsLeft; b.top = dsTop; b.el.style.left = b.left + '%'; b.el.style.top = b.top + '%'; }); }, 160); });
    })();

    /* ===== Headlight code (unchanged below) ===== */
    (function() {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const wrapper = hero.querySelector('.hero-image-wrapper') || hero.querySelector('.relative');
      const img = document.getElementById('heroImg');
      const leftHL = hero.querySelector('.headlight-left');
      const rightHL = hero.querySelector('.headlight-right');

      if (!wrapper || !img || !leftHL || !rightHL) {
        if (img) img.classList.remove('await-flash');
        return;
      }

      // reduce motion / touch fallback
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isTouch || prefersReduced) { img.classList.remove('await-flash'); return; }

      function parseData(attr, fallback){
        const v = img.getAttribute(attr);
        if (!v) return fallback;
        const n = parseFloat(v);
        return isNaN(n) ? fallback : n;
      }

      const leftX = parseData('data-headlight-left-x', 0.22);
      const rightX = parseData('data-headlight-right-x', 0.78);
      const anchorY = parseData('data-headlight-y', 0.44);
      const scale = parseData('data-headlight-scale', 0.34);
      const rotate = parseData('data-headlight-rotate', -6);
      const verticalOffset = parseData('data-headlight-offset-y', 0.26); // move flash downward

      function place(lightEl, anchorX) {
        const wrapRect = wrapper.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        if (imgRect.width === 0 || imgRect.height === 0) return;

        let anchorPxX = (imgRect.left - wrapRect.left) + (anchorX * imgRect.width);
        let anchorPxY = (imgRect.top - wrapRect.top) + (anchorY * imgRect.height);

        // lower the flash so it sits over car features
        anchorPxY += imgRect.height * verticalOffset;

        const w = Math.max(48, imgRect.width * scale);
        const h = w * 0.66;

        lightEl.style.left = `${anchorPxX}px`;
        lightEl.style.top = `${anchorPxY}px`;
        lightEl.style.width = `${w}px`;
        lightEl.style.height = `${h}px`;
        lightEl.style.transform = `translate(-50%,-50%) rotate(${rotate}deg)`;
      }

      const RO = ('ResizeObserver' in window) ? new ResizeObserver(() => { place(leftHL,leftX); place(rightHL,rightX); }) : null;
      if (RO) { RO.observe(img); RO.observe(wrapper); } else { window.addEventListener('resize', () => { place(leftHL,leftX); place(rightHL,rightX); }); }

      function onImgReady() {
        place(leftHL,leftX);
        place(rightHL,rightX);

        const mo = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.attributeName === 'class' && hero.classList.contains('is-visible')) {
              playFlash();
              mo.disconnect();
              break;
            }
          }
        });
        mo.observe(hero, { attributes: true });

        if (hero.classList.contains('is-visible')) playFlash();
      }

      if (img.complete && img.naturalWidth !== 0) onImgReady();
      else { img.addEventListener('load', onImgReady, { once: true }); setTimeout(onImgReady, 900); }

      let t = null;
      ['scroll','orientationchange'].forEach(e => window.addEventListener(e, () => {
        clearTimeout(t);
        t = setTimeout(() => { place(leftHL,leftX); place(rightHL,rightX); }, 120);
      }, { passive: true }));

      function playFlash() {
        // recompute
        place(leftHL,leftX); place(rightHL,rightX);

        const STAGGER = 36;
        const FLASH_TOTAL = 1200;
        const RELEASE_DELAY = Math.max(200, Math.floor(FLASH_TOTAL * 0.45));

        // show flash overlays (no dim)
        leftHL.classList.add('headlight-active');
        setTimeout(() => rightHL.classList.add('headlight-active'), STAGGER);

        // reveal the car after a short delay so slide-in appears after flash
        setTimeout(() => img.classList.remove('await-flash'), RELEASE_DELAY);

        // cleanup
        setTimeout(() => {
          leftHL.classList.remove('headlight-active');
          rightHL.classList.remove('headlight-active');
        }, FLASH_TOTAL + 140);
      }

      window.addEventListener('pagehide', () => { if (RO) RO.disconnect(); });
    })();

  // HERO BUTTON LOGIC
(function() {
  const heroBtn = document.getElementById('heroActionBtn');
  if (!heroBtn) return;

  // Track login state
  let isLoggedIn = false;

  // When user clicks "Get Started →"
  heroBtn.addEventListener('click', (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      // open your login/signup modal (uses your existing function)
      if (typeof openModal === 'function') {
        openModal('signup');
      } else {
        // fallback: manually trigger the overlay if not globally exposed
        const toggleBtn = document.getElementById('authToggleBtn');
        if (toggleBtn) toggleBtn.click();
      }

      // Simulate login callback — replace with your actual auth logic
      // You can trigger this after Firebase/Auth API success callback
      document.addEventListener('userLoggedIn', () => {
        isLoggedIn = true;
        heroBtn.textContent = 'Start Comparing →';
        heroBtn.classList.remove('bg-red-600');
        heroBtn.classList.add('bg-green-600', 'hover:bg-green-700');
      }, { once: true });

    } else {
      // Redirect user to compare page after login
      window.location.href = '/compare.html'; // or your compare route
    }
  });

  // Example: simulate login success manually (for demo/testing)
  // You’ll remove this when real auth integration is connected
  window.demoLoginSuccess = function() {
    const event = new Event('userLoggedIn');
    document.dispatchEvent(event);
  };
})();

/* ===== Car tilt + cursor-follow juggle (updated: real jumps + faster tilt) ===== */
/* ===== Car tilt + cursor-follow juggle (with zoom-in + enhanced movement) ===== */
(function() {
  const img = document.getElementById('heroImg');
  if (!img) return;

  // Respect reduced-motion and touch devices
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (prefersReduced || isTouch) return;

  // Wrap the image in .tilt-wrap (if not already)
  let wrap = img.parentElement;
  if (!wrap.classList.contains('tilt-wrap')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tilt-wrap';
    wrapper.style.display = getComputedStyle(img).display === 'block' ? 'block' : 'inline-block';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrap = wrapper;
  }
  img.classList.add('tilt-img');
  // ensure base transform exists so first hover animates correctly
  img.style.transform = 'translateY(0px) rotateX(0deg) rotateY(0deg) scale(1)';
  img.style.willChange = 'transform';

      img.style.transition = 'transform 240ms cubic-bezier(.18,.9,.28,1)';
      setTimeout(() => { img.style.transition = ''; }, 400);
   

  // === Configuration (tuned for more visible zoom-in + stronger movement) ===
  const CONFIG = {
     maxRotateY: 20,    // stronger horizontal tilt
     maxRotateX: 16,    // stronger vertical tilt
     maxLift: 60,       // higher lift toward viewer
     juggleAmp: 1.6,    // slightly more wobble
     juggleFreq: 2.8,   // small speed boost
     returnSpeed: 0.18, // smooth return
     smoothing: 0.68,   // faster, snappier tilt
     zoomInScale: 1.15  // slightly more pronounced zoom-in
     };

  // state
  let target = { rx: 0, ry: 0, ty: 0 };
  let current = { rx: 0, ry: 0, ty: 0 };
  let currentScale = 1;
  let raf = null;
  let hovering = false;
  let startTime = 0;

  // map cursor -> target rotation & lift
  function setTargetFromPointer(clientX, clientY) {
    const rect = img.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    const cx = (relX - 0.5) * 2;
    const cy = (relY - 0.5) * 2;

    const ry = -cx * CONFIG.maxRotateY;
    const rx = cy * CONFIG.maxRotateX;

    const distToCenter = Math.hypot(cx, cy);
    const lift = Math.max(0, (1 - Math.min(1, distToCenter))) * CONFIG.maxLift;

    target.rx = rx;
    target.ry = ry;
    target.ty = -lift * 0.6;
  }

  const lerp = (a, b, t) => a + (b - a) * t;

  // main animation loop
  function tick(now) {
    if (!startTime) startTime = now;
    const t = (now - startTime) / 1000;

    const juggle = hovering
      ? Math.sin(t * Math.PI * 2 * CONFIG.juggleFreq) * CONFIG.juggleAmp
      : 0;

    const intendedRx = target.rx + juggle * (target.rx === 0 ? 1 : Math.sign(target.rx));
    const intendedRy = target.ry + juggle * 0.45;
    const intendedTy = target.ty;

    const smooth = hovering ? CONFIG.smoothing : CONFIG.returnSpeed;
    current.rx = lerp(current.rx, intendedRx, smooth);
    current.ry = lerp(current.ry, intendedRy, smooth);
    current.ty = lerp(current.ty, intendedTy, smooth);

    // smooth zoom-in scale while hovering
    const targetScale = hovering ? CONFIG.zoomInScale : 1;
    currentScale = lerp(currentScale, targetScale, 0.15);

    img.style.transform = `
      translateY(${current.ty.toFixed(2)}px)
      rotateX(${current.rx.toFixed(3)}deg)
      rotateY(${current.ry.toFixed(3)}deg)
      scale(${currentScale.toFixed(3)})
    `;

    raf = requestAnimationFrame(tick);
  }

  function startRAF() { if (!raf) raf = requestAnimationFrame(tick); }
  function stopRAF() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // jump sequence
  function performJumpSequence() {
    if (img.dataset.jumping === '1') return;
    img.dataset.jumping = '1';

    target.ty = -Math.max(40, CONFIG.maxLift * 0.95);
    setTimeout(() => { target.ty = -Math.max(20, CONFIG.maxLift * 0.55); }, 110);
    setTimeout(() => { img.dataset.jumping = '0'; }, 320);
  }

  // pointer handlers
  function onPointerMove(e) {
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x && y) setTargetFromPointer(x, y);
  }

  function onPointerEnter(e) {
    hovering = true;
    img.classList.add('is-hovering');
    onPointerMove(e);
    startTime = 0;
    startRAF();
    performJumpSequence();
  }

  function onPointerLeave() {
    hovering = false;
    target.rx = target.ry = target.ty = 0;
    img.classList.remove('is-hovering');

    const stopper = setInterval(() => {
      const nearNeutral =
        Math.abs(current.rx) < 0.06 &&
        Math.abs(current.ry) < 0.06 &&
        Math.abs(current.ty) < 0.9 &&
        Math.abs(currentScale - 1) < 0.01;

      if (nearNeutral) {
        clearInterval(stopper);
        stopRAF();
        img.style.transition = 'transform 240ms cubic-bezier(.18,.9,.28,1)';
        img.style.transform = 'translateY(0px) rotateX(0deg) rotateY(0deg) scale(1)';
        setTimeout(() => { img.style.transition = ''; }, 300);
      }
    }, 60);
  }

  // attach listeners
  wrap.addEventListener('pointerenter', onPointerEnter, { passive: true });
  wrap.addEventListener('pointermove', onPointerMove, { passive: true });
  wrap.addEventListener('pointerleave', onPointerLeave, { passive: true });

  wrap.addEventListener('touchstart', onPointerEnter, { passive: true });
  wrap.addEventListener('touchmove', onPointerMove, { passive: true });
  wrap.addEventListener('touchend', onPointerLeave, { passive: true });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {}, 80);
  }, { passive: true });
  window.addEventListener('scroll', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {}, 120);
  }, { passive: true });
})();


/* ===== Replace and lock the custom cursor: fixed tilt (slightly left) ===== */
(function () {
  // find existing cursor element
  const old = document.getElementById('gameCursor');
  if (!old) return;

  // clone the node (keep children)
  const fresh = old.cloneNode(true);
  fresh.id = 'gameCursor';
  fresh.style.opacity = '0';
  fresh.style.left = '50%';
  fresh.style.top = '50%';
  fresh.style.transform = 'translate(-50%,-50%) rotate(-12deg) scale(1)'; // <-- tilt left
  fresh.style.willChange = 'left,top,transform';
  fresh.style.pointerEvents = 'none';

  old.parentNode && old.parentNode.replaceChild(fresh, old);

  const cursor = document.getElementById('gameCursor');
  if (!cursor) return;

  // Respect touch / reduced-motion
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouch || prefersReduce) { cursor.remove(); return; }

  const headerEl = document.querySelector('header');

  let targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
  let currentX = targetX, currentY = targetY;
  let rafId = null;
  let visible = false;
  let isClickable = false;

  const lerp = (a,b,t) => a + (b - a) * t;
  const POS_SMOOTH = 0.14;
  const FADE_MS = 120;
  const FIXED_TILT = -28; // adjust this number for more or less tilt

  function elementInteractiveAt(x,y) {
    const el = document.elementFromPoint(x,y);
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'textarea' || el.getAttribute('role') === 'button') return true;
    if (el.closest && el.closest('[data-cursor="clickable"]')) return true;
    return false;
  }

  function showCustom(hideNative=false) {
    if (hideNative) document.body.classList.add('cursor-none');
    if (!visible) {
      cursor.style.transition = `opacity ${FADE_MS}ms linear, transform 140ms cubic-bezier(.2,.9,.3,1)`;
      cursor.style.opacity = '1';
      visible = true;
    }
  }
  function hideCustom() {
    document.body.classList.remove('cursor-none');
    cursor.style.opacity = '0';
    visible = false;
  }

  window.addEventListener('mousemove', (e) => {
    const overHeader = headerEl && (e.target === headerEl || !!e.target.closest('header'));
    if (overHeader) { hideCustom(); return; }
    else showCustom(true);

    targetX = e.clientX;
    targetY = e.clientY;

    const hoverInteractive = elementInteractiveAt(e.clientX, e.clientY);
    if (hoverInteractive !== isClickable) {
      isClickable = hoverInteractive;
      const scale = isClickable ? 1.18 : 1;
      cursor.style.transform = `translate(-50%,-50%) rotate(${FIXED_TILT}deg) scale(${scale})`;
      const glow = cursor.querySelector('div');
      if (glow) glow.style.filter = isClickable ? 'blur(18px)' : 'blur(22px)';
    }
  }, { passive: true });

  window.addEventListener('mousedown', () => {
    cursor.style.transform = `translate(-50%,-50%) rotate(${FIXED_TILT}deg) scale(0.94)`;
  });
  window.addEventListener('mouseup', () => {
    const scale = isClickable ? 1.18 : 1;
    cursor.style.transform = `translate(-50%,-50%) rotate(${FIXED_TILT}deg) scale(${scale})`;
  });

  window.addEventListener('mouseleave', hideCustom);
  window.addEventListener('mouseenter', () => showCustom(true));

  window.addEventListener('resize', () => {
    targetX = Math.min(window.innerWidth, targetX);
    targetY = Math.min(window.innerHeight, targetY);
  });

  function loop() {
    currentX = lerp(currentX, targetX, POS_SMOOTH);
    currentY = lerp(currentY, targetY, POS_SMOOTH);

    cursor.style.left = currentX + 'px';
    cursor.style.top  = currentY + 'px';

    const baseScale = isClickable ? 1.18 : 1;
    // keep constant left tilt
    cursor.style.transform = `translate(-50%,-50%) rotate(${FIXED_TILT}deg) scale(${baseScale})`;

    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(rafId);
    document.body.classList.remove('cursor-none');
  });

  window.gameCursor = {
    setSize(px) {
      const svg = cursor.querySelector('svg');
      if (svg) {
        svg.style.width = px + 'px';
        svg.style.height = Math.round(px * (svg.clientHeight / svg.clientWidth)) + 'px';
      }
    },
    disable() {
      cursor.remove();
      document.body.classList.remove('cursor-none');
    }
  };
})();

/* BEFORE/AFTER multi-portal controller — click & hold anywhere to drag (multi-instance) */
(function () {
  const portals = Array.from(document.querySelectorAll('.before-after-portal .ba-wrap'));
  if (!portals.length) return;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // track which portal is currently being dragged (null when none)
  let currentDragging = null;

  // helper to convert clientX -> percent for given portal
  function posToPercentForPortal(portal, clientX) {
    const rect = portal.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    return (x / rect.width) * 100;
  }

  // initializer for one portal element
  function initPortal(portal, index) {
    const afterWrap = portal.querySelector('.ba-after-wrap');
    const handleBtn = portal.querySelector('.ba-handle');
    const range = portal.querySelector('.ba-range');
    const divider = portal.querySelector('.ba-divider') || portal.querySelector('.ba-divider');

    // safe guards
    if (!afterWrap || !range) return;

    function setPercent(p) {
      p = clamp(p, 0, 100);
      afterWrap.style.width = p + '%';
      if (divider) divider.style.left = p + '%';
      range.value = String(Math.round(p));
    }

    // initial state
    setPercent(Number(range.value || 50));

    let dragging = false;

    function startDrag(e) {
      // allow only left button for mouse
      if (e.type === 'mousedown' && e.button !== 0) return;
      e.preventDefault();
      currentDragging = portal;
      dragging = true;
      portal.classList.add('ba-dragging');

      // pointer capture if available
      if (e.pointerId && portal.setPointerCapture) portal.setPointerCapture(e.pointerId);

      const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX));
      setPercent(posToPercentForPortal(portal, clientX));
    }

    function onMove(e) {
      if (!dragging || currentDragging !== portal) return;
      const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      setPercent(posToPercentForPortal(portal, clientX));
    }

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      portal.classList.remove('ba-dragging');

      if (e && e.pointerId && portal.releasePointerCapture) portal.releasePointerCapture(e.pointerId);
      // release global dragging marker only if this portal was current
      if (currentDragging === portal) currentDragging = null;
    }

    // Attach listeners on the portal itself for starting drag (mouse & touch)
    portal.addEventListener('mousedown', startDrag);
    portal.addEventListener('touchstart', startDrag, { passive: false });

    // Move and end are listened at window-level so dragging outside the portal still updates properly
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', endDrag);

    // quick click (if not dragging)
    portal.addEventListener('click', (ev) => {
      if (portal.classList.contains('ba-dragging')) return;
      setPercent(posToPercentForPortal(portal, ev.clientX));
    });

    // keyboard accessibility for handle (if present)
    if (handleBtn) {
      handleBtn.addEventListener('keydown', (ev) => {
        const step = ev.shiftKey ? 10 : 5;
        let v = Number(range.value || 50);
        if (ev.key === 'ArrowLeft') { v = clamp(v - step, 0, 100); setPercent(v); ev.preventDefault(); }
        if (ev.key === 'ArrowRight') { v = clamp(v + step, 0, 100); setPercent(v); ev.preventDefault(); }
        if (ev.key === 'Home') { setPercent(0); ev.preventDefault(); }
        if (ev.key === 'End') { setPercent(100); ev.preventDefault(); }
      });
    }

    // range input control (screen-reader friendly)
    range.addEventListener('input', (e) => { setPercent(Number(e.target.value)); });

    // update on window resize so percent remains visually correct
    window.addEventListener('resize', () => { setPercent(Number(range.value || 50)); });

    // expose instance API
    return {
      el: portal,
      setPercent,
      setImages(beforeSrc, afterSrc) {
        const beforeImg = portal.querySelector('.ba-before');
        const afterImg = portal.querySelector('.ba-after');
        if (beforeImg && beforeSrc) beforeImg.src = beforeSrc;
        if (afterImg && afterSrc) afterImg.src = afterSrc;
      },
      getPercent() { return Number(range.value || 50); }
    };
  }

  // initialize all portals and keep instances list
  const instances = portals.map((p, i) => initPortal(p, i)).filter(Boolean);

  // global API for multi-portal control
  window.beforeAfter = window.beforeAfter || {};
  window.beforeAfter.instances = instances;
  window.beforeAfter.setImages = function (idxOrNode, beforeSrc, afterSrc) {
    if (typeof idxOrNode === 'number') {
      const inst = instances[idxOrNode];
      if (inst) inst.setImages(beforeSrc, afterSrc);
    } else if (idxOrNode && idxOrNode.nodeType) {
      const inst = instances.find(it => it.el === idxOrNode);
      if (inst) inst.setImages(beforeSrc, afterSrc);
    }
  };
  window.beforeAfter.setPercent = function (idxOrNode, percent) {
    if (typeof idxOrNode === 'number') {
      const inst = instances[idxOrNode];
      if (inst) inst.setPercent(percent);
    } else if (idxOrNode && idxOrNode.nodeType) {
      const inst = instances.find(it => it.el === idxOrNode);
      if (inst) inst.setPercent(percent);
    } else if (idxOrNode === undefined) {
      // set all portals
      instances.forEach(i => i.setPercent(percent));
    }
  };

})();

// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const authButton = document.getElementById('authToggleBtn');

  // If avatar helper exists (auth.js), prefer that because it renders image + dropdown
  if (typeof window.vvRenderAuthToggle === 'function') {
    // defer one tick to allow auth.js to initialize if it is still running
    setTimeout(() => {
      try { window.vvRenderAuthToggle(); } catch (e) { console.warn('vvRenderAuthToggle error', e); }
    }, 8);
  } else if (window.auth && typeof window.auth.isLoggedIn === 'function' && window.auth.isLoggedIn()) {
    // fallback: set simple text
    if (authButton) authButton.innerText = "Account";
  } else {
    if (authButton) authButton.innerText = "Sign In";
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      // prefer window.auth.signOut if available
      try {
        if (window.auth && typeof window.auth.signOut === 'function') await window.auth.signOut();
        else if (typeof window.signOut === 'function') await window.signOut();
      } catch(e) { console.warn('logout error', e); }
      location.reload();
    });
  }
});



/* ============================
   Canvas wave animation init (with exposed resize + pause/resume)
   - Looks for #authWavesCanvas and draws the red wave flow
   - Exposes canvas._resize() so openModal can force correct sizing after overlay shown
   - Pauses animation when overlay is hidden; resumes when opened
   ============================ */

(function initAuthCanvasWave() {
  const canvas = document.getElementById('authWavesCanvas');
  // NOTE: authOverlay may now live in auth.js; query it locally so we don't depend on external scope.
  const overlay = document.getElementById('authOverlay');

  if (!canvas) return;
  if (!overlay) {
    console.warn('initAuthCanvasWave: #authOverlay not found — overlay-related observers will be disabled.');
  }

  const ctx = canvas.getContext('2d', { alpha: true });

  // make canvas fill wrapper measured in CSS (#authWaves)
  function resizeCanvasToRect(attempt = 0) {
    const rect = canvas.getBoundingClientRect();
    // guard: if rect has zero size, retry a few times (overlay may be animating)
    if ((rect.width === 0 || rect.height === 0) && attempt < 6) {
      // retry later (gives CSS time to reveal); this prevents bad zero-size sizing
      return window.requestAnimationFrame(() => resizeCanvasToRect(attempt + 1));
    }
    if (rect.width === 0 || rect.height === 0) {
      // nothing to do
      return;
    }
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    // compute integer pixel size for crispness
    const wPx = Math.round(rect.width * dpr);
    const hPx = Math.round(rect.height * dpr);
    // only update when changed to avoid unnecessary DOM thrash
    if (canvas.width !== wPx || canvas.height !== hPx) {
      canvas.width = wPx;
      canvas.height = hPx;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // expose safe resize method so callers can force resize after overlay visible
  canvas._resize = () => { resizeCanvasToRect(0); };

  // Wave layer definitions (red/white -> deep red)
  const layers = [
    {
      amplitude: 24,
      wavelength: 0.01,
      speed: 0.02,
      yOffset: 0.36,
      lineWidth: 36,
      gradientStops: [
        { stop: 0.0, color: 'rgba(255,255,255,0.95)' },
        { stop: 0.5, color: 'rgba(255,80,80,0.92)' },
        { stop: 1.0, color: 'rgba(160,20,20,0.85)' }
      ],
      blur: 8,
      composite: 'lighter'
    },
    {
      amplitude: 40,
      wavelength: 0.0065,
      speed: 0.011,
      yOffset: 0.5,
      lineWidth: 64,
      gradientStops: [
        { stop: 0.0, color: 'rgba(255,110,110,0.86)' },
        { stop: 0.6, color: 'rgba(200,40,40,0.86)' },
        { stop: 1.0, color: 'rgba(110,18,18,0.72)' }
      ],
      blur: 16,
      composite: 'lighter'
    },
    {
      amplitude: 62,
      wavelength: 0.0045,
      speed: 0.006,
      yOffset: 0.68,
      lineWidth: 112,
      gradientStops: [
        { stop: 0.0, color: 'rgba(180,30,30,0.7)' },
        { stop: 0.5, color: 'rgba(120,18,18,0.6)' },
        { stop: 1.0, color: 'rgba(255,255,255,0.04)' }
      ],
      blur: 26,
      composite: 'lighter'
    }
  ];

  let last = performance.now();
  let phases = layers.map(() => Math.random() * Math.PI * 2);
  let rafId = null;
  let running = false;

  function drawLayer(layer, phase) {
    const { amplitude, wavelength, yOffset, lineWidth, gradientStops, blur, composite } = layer;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    gradientStops.forEach(s => grad.addColorStop(s.stop, s.color));

    ctx.save();
    ctx.globalCompositeOperation = composite || 'source-over';
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = grad;
    ctx.filter = `blur(${blur}px)`;

    ctx.beginPath();
    const midY = h * yOffset;
    const step = Math.max(2, Math.round(w / 220));
    for (let x = 0; x <= w; x += step) {
      const t = (x * wavelength) + phase;
      const y = midY + Math.sin(t) * amplitude + Math.sin(t * 0.58) * (amplitude * 0.45);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Transparent backdrop: simply clear the canvas. (we want page to show through)
  function clearFrame() {
    // clear using pixel dimensions to ensure full clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function animate(now) {
    const dt = (now - last) / 1000;
    last = now;

    // safety: skip if not sized yet
    if (canvas.width <= 0 || canvas.height <= 0) {
      rafId = requestAnimationFrame(animate);
      return;
    }

    clearFrame();

    layers.forEach((layer, i) => {
      phases[i] += layer.speed * dt * Math.PI * 2;
      drawLayer(layer, phases[i]);
    });

    // optional soft highlight (keeps glassy feel while remaining transparent)
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    rafId = requestAnimationFrame(animate);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(animate);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // attach so modal code can control / call resize/start/stop
  canvas._start = start;
  canvas._stop = stop;

  // initial resize attempt; if overlay hidden this will be retried from observer when visible
  resizeCanvasToRect();

  // debounce helper for window resize events
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = window.requestAnimationFrame(() => {
      resizeCanvasToRect();
    });
  }, { passive: true });

  // Debounced MutationObserver for overlay visibility
  // (only observe if overlay exists; otherwise skip overlay-based start/stop)
  let lastVisibility = overlay ? overlay.classList.contains('hidden') : true;
  let moTimer = null;
  const mo = new MutationObserver((mutations) => {
    if (!overlay) return;
    // we only care whether overlay has class 'hidden' or not
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden === lastVisibility) return; // no change
    lastVisibility = isHidden;
    if (moTimer) clearTimeout(moTimer);
    moTimer = setTimeout(() => {
      if (!isHidden) {
        // visible -> resize and start (ensure layout settled)
        window.requestAnimationFrame(() => {
          resizeCanvasToRect();
          // start after one more frame to avoid jump
          window.requestAnimationFrame(() => {
            start();
          });
        });
      } else {
        // hidden -> stop
        stop();
      }
    }, 80); // small debounce so quick toggles don't thrash
  });

  if (overlay) {
    mo.observe(overlay, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // if overlay already visible on load, start immediately (after resize)
  if (overlay && !overlay.classList.contains('hidden')) {
    // schedule resize+start a couple frames in
    window.requestAnimationFrame(() => {
      resizeCanvasToRect();
      window.requestAnimationFrame(() => start());
    });
  }
})();

/* ==========================
   Gradient Border + Outside Moving Strips (adjusted)
   - Border is slightly larger than the card (outsides show)
   - Removed the thin moving line that crossed the card
   Paste after your modal HTML.
   ========================== */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('authOverlay');
  const card = document.getElementById('authCard');
  const closeBtn = document.getElementById('authCloseBtn');
  const backdrop = document.getElementById('authOverlayBackdrop');

  // card is required; overlay is optional (auth modal logic may be in auth.js)
  if (!card) {
    console.warn('Gradient border script: #authCard not found — skipping gradient border.');
    return;
  }
  if (!overlay) {
    console.warn('Gradient border script: #authOverlay not found — overlay-related hooks will be disabled.');
  }

  // CONFIG: tweak to nudge/size the border
  const offsetX = 3; // px to move border to the right
  const offsetY = 4; // px to move border down
  const outPad = 4;  // how much border extends outward beyond card edges
  const strokeWidth = 4; // border stroke width

  const uid = 'gbrd-' + Date.now().toString(36);
  const containerAttr = 'data-gbrd-root';

  // create styles (once)
  if (!document.getElementById(uid + '-styles')) {
    const style = document.createElement('style');
    style.id = uid + '-styles';
    style.textContent = `
      @keyframes gbrd-move-x {
        0% { transform: translateX(-40%); }
        100% { transform: translateX(40%); }
      }
      @keyframes gbrd-pulse {
        0% { opacity: 0.55; transform: scaleY(1); }
        50% { opacity: 0.9; transform: scaleY(1.08); }
        100% { opacity: 0.55; transform: scaleY(1); }
      }
      .gbrd-strip {
        position: absolute;
        left: -50%;
        width: 200%;
        pointer-events: none;
        mix-blend-mode: screen;
        transform-origin: center;
        will-change: transform, opacity, top;
      }
      .gbrd-strip.glow {
        filter: blur(18px);
        opacity: 0.6;
      }
    `;
    document.head.appendChild(style);
  }

  // debounced refresh helper (runs on next animation frame, coalesces calls)
  let rafId = null;
  function rafDebounce(fn) {
    return function () {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        fn();
      });
    };
  }

  // state holder
  let gInstance = null;

  function ensureGradientBorder() {
    if (card.querySelector(`[${containerAttr}]`)) return gInstance;

    // root container inserted as first child, transformed for offset
    const root = document.createElement('div');
    root.setAttribute(containerAttr, uid);
    root.style.position = 'absolute';
    root.style.inset = '0';
    root.style.pointerEvents = 'none';
    root.style.borderRadius = 'inherit';
    root.style.boxSizing = 'border-box';
    root.style.zIndex = '0';
    root.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    root.style.transformOrigin = '0 0';

    // compute radius
    const comp = getComputedStyle(card);
    const radius = comp.borderRadius && comp.borderRadius !== '0px' ? comp.borderRadius : '18px';
    let rx = 18;
    const pxMatch = radius.match(/^([0-9.]+)px$/);
    if (pxMatch) rx = Math.max(6, Math.min(120, Number(pxMatch[1])));

    // SVG border
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.position = 'absolute';
    svg.style.left = (-outPad) + 'px';
    svg.style.top = (-outPad) + 'px';
    svg.style.width = 'calc(100% + ' + (outPad * 2) + 'px)';
    svg.style.height = 'calc(100% + ' + (outPad * 2) + 'px)';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '2';

    const defs = document.createElementNS(svgNS, 'defs');
    const gradId = `gbrd-grad-${uid}`;
    const grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0%'); grad.setAttribute('x2', '100%'); grad.setAttribute('y1', '0%'); grad.setAttribute('y2', '0%');

    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset','0%'); stop1.setAttribute('stop-color','#ff6b6b'); stop1.setAttribute('stop-opacity','1');
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset','50%'); stop2.setAttribute('stop-color','#ff2d55'); stop2.setAttribute('stop-opacity','1');
    const stop3 = document.createElementNS(svgNS, 'stop');
    stop3.setAttribute('offset','100%'); stop3.setAttribute('stop-color','#ffa3a3'); stop3.setAttribute('stop-opacity','1');

    grad.appendChild(stop1); grad.appendChild(stop2); grad.appendChild(stop3);
    defs.appendChild(grad);

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', `url(#${gradId})`);
    rect.setAttribute('stroke-linejoin', 'round');
    rect.setAttribute('stroke-linecap', 'round');
    rect.setAttribute('vector-effect', 'non-scaling-stroke');
    rect.setAttribute('stroke-width', strokeWidth);

    defs && svg.appendChild(defs);
    svg.appendChild(rect);

    // layout function: set rect to card size + outPad
    function layoutSVG() {
      const r = card.getBoundingClientRect();
      const x = -outPad;
      const y = -outPad;
      const w = Math.max(0, r.width + outPad * 2);
      const h = Math.max(0, r.height + outPad * 2);
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', rx + outPad);
      rect.setAttribute('ry', rx + outPad);
      svg.style.width = (r.width + outPad * 2) + 'px';
      svg.style.height = (r.height + outPad * 2) + 'px';
      svg.style.left = (-outPad) + 'px';
      svg.style.top = (-outPad) + 'px';
    }

    // moving strips placed clearly outside card bounds
    function makeStrip({heightPx = 34, blur = 16, speed = 9, opacity = 0.6, verticalOffset = -0.95}) {
      const strip = document.createElement('div');
      strip.className = 'gbrd-strip glow';
      const r = card.getBoundingClientRect();
      const top = r.height * (0.5 + verticalOffset) - (heightPx / 2);
      strip.style.top = (top) + 'px';
      strip.style.height = heightPx + 'px';
      strip.style.transform = 'translateX(-40%)';
      strip.style.opacity = String(opacity);
      strip.style.filter = `blur(${blur}px)`;
      strip.style.background = `
        linear-gradient(90deg,
          rgba(255,45,85,0) 0%,
          rgba(255,45,85,0.18) 15%,
          rgba(255,45,85,0.55) 50%,
          rgba(255,45,85,0.18) 85%,
          rgba(255,45,85,0) 100%)
      `;
      strip.style.animation = `gbrd-move-x ${speed}s linear infinite, gbrd-pulse ${Math.max(4, speed/2)}s ease-in-out infinite`;
      strip.style.zIndex = '1';
      strip.style.pointerEvents = 'none';
      strip.style.left = '-50%';
      strip.style.width = '200%';
      strip.style.borderRadius = '999px';
      return strip;
    }

    const stripTop = makeStrip({heightPx: 34, blur: 16, speed: 9, opacity: 0.6, verticalOffset: -0.95});
    const stripBottom = makeStrip({heightPx: 48, blur: 22, speed: 12, opacity: 0.45, verticalOffset: 0.95});

    // append and insert
    root.appendChild(stripTop);
    root.appendChild(stripBottom);
    root.appendChild(svg);
    card.insertBefore(root, card.firstChild);

    // resize observer -> layout on size change
    const ro = new ResizeObserver(rafDebounce(() => {
      layoutSVG();
      const r = card.getBoundingClientRect();
      stripTop.style.top = (r.height * (0.5 - 0.95) - (34/2)) + 'px';
      stripBottom.style.top = (r.height * (0.5 + 0.95) - (48/2)) + 'px';
    }));
    ro.observe(card);

    // mutation observer -> watch for subtree changes (class toggles/hide/show)
    const mo = new MutationObserver(rafDebounce(() => {
      layoutSVG();
      const r = card.getBoundingClientRect();
      stripTop.style.top = (r.height * (0.5 - 0.95) - (34/2)) + 'px';
      stripBottom.style.top = (r.height * (0.5 + 0.95) - (48/2)) + 'px';
    }));
    mo.observe(card, { attributes: true, childList: true, subtree: true, characterData: false });

    // also catch transitionend for CSS transitions on child elements
    const transitionHandler = () => rafDebounce(() => {
      layoutSVG();
      const r = card.getBoundingClientRect();
      stripTop.style.top = (r.height * (0.5 - 0.95) - (34/2)) + 'px';
      stripBottom.style.top = (r.height * (0.5 + 0.95) - (48/2)) + 'px';
    })();

    card.addEventListener('transitionend', transitionHandler, true);

    // initial layout
    layoutSVG();

    gInstance = {
      root,
      svg,
      strips: [stripTop, stripBottom],
      resizeObserver: ro,
      mutationObserver: mo,
      cleanup() {
        try { ro.disconnect(); } catch (e) {}
        try { mo.disconnect(); } catch (e) {}
        try { card.removeEventListener('transitionend', transitionHandler, true); } catch (e) {}
        if (root && root.parentNode) root.parentNode.removeChild(root);
      },
      refresh() {
        layoutSVG();
        const r = card.getBoundingClientRect();
        stripTop.style.top = (r.height * (0.5 - 0.95) - (34/2)) + 'px';
        stripBottom.style.top = (r.height * (0.5 + 0.95) - (48/2)) + 'px';
      },
      setOptions(opts = {}) {
        if (opts.colorStops) {
          try {
            stop1.setAttribute('stop-color', opts.colorStops[0] || '#ff6b6b');
            stop2.setAttribute('stop-color', opts.colorStops[1] || '#ff2d55');
            stop3.setAttribute('stop-color', opts.colorStops[2] || '#ffa3a3');
          } catch(e) {
            // defensive: if stops not available for some reason, ignore
          }
        }
      }
    };

    return gInstance;
  } // end ensureGradientBorder

  // open/close helpers
  function openAuthModal() {
    if (overlay) overlay.classList.remove('hidden');
    // ensure border created & layout after any opening transitions settle
    requestAnimationFrame(() => {
      ensureGradientBorder();
      // small timeout to allow CSS show transitions to begin — then refresh again
      setTimeout(() => { if (gInstance && typeof gInstance.refresh === 'function') gInstance.refresh(); }, 60);
      setTimeout(() => { if (gInstance && typeof gInstance.refresh === 'function') gInstance.refresh(); }, 220);
      const firstInput = card.querySelector('input');
      if (firstInput) firstInput.focus();
    });
  }

  function closeAuthModal() {
    if (overlay) overlay.classList.add('hidden');
    if (gInstance && typeof gInstance.cleanup === 'function') {
      gInstance.cleanup();
      gInstance = null;
    }
  }

  // wire up close/backdrop
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  if (backdrop) backdrop.addEventListener('click', closeAuthModal);

  // example open button
  const openBtn = document.getElementById('openAuthBtn');
  if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(); });

  // detect overlay class toggles if other code toggles it
  if (overlay) {
    const moOverlay = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          const isHidden = overlay.classList.contains('hidden');
          if (!isHidden) {
            requestAnimationFrame(() => ensureGradientBorder());
          } else {
            if (gInstance && typeof gInstance.cleanup === 'function') {
              gInstance.cleanup();
              gInstance = null;
            }
          }
        }
      }
    });
    moOverlay.observe(overlay, { attributes: true });
  }

});


// 🌟 Star Border Animation for Get Started Button
  const btn = document.getElementById('heroActionBtn');

  // Basic setup (you can tweak color/speed)
  const color = 'white';  // or 'red', 'cyan', etc.
  const speed = '6s';

  // Style base button container
  Object.assign(btn.style, {
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1
  });

  // Create top & bottom blobs
  const blobTop = document.createElement('div');
  const blobBottom = document.createElement('div');

  [blobTop, blobBottom].forEach(blob => {
    Object.assign(blob.style, {
      position: 'absolute',
      width: '300%',
      height: '50%',
      opacity: '0.7',
      borderRadius: '999px',
      pointerEvents: 'none',
      zIndex: 0,
      background: `radial-gradient(circle, ${color}, transparent 15%)`,
      mixBlendMode: 'screen',
      filter: 'blur(8px)',
    });
  });

  // bottom blob (moves right → left)
  blobBottom.style.bottom = '-11px';
  blobBottom.style.right = '-250%';
  blobBottom.animate(
    [
      { transform: 'translate(0%, 0%)', opacity: 1 },
      { transform: 'translate(-100%, 0%)', opacity: 0 }
    ],
    { duration: parseFloat(speed) * 1000, iterations: Infinity, direction: 'alternate', easing: 'linear' }
  );

  // top blob (moves left → right)
  blobTop.style.top = '-10px';
  blobTop.style.left = '-250%';
  blobTop.animate(
    [
      { transform: 'translate(0%, 0%)', opacity: 1 },
      { transform: 'translate(100%, 0%)', opacity: 0 }
    ],
    { duration: parseFloat(speed) * 1000, iterations: Infinity, direction: 'alternate', easing: 'linear' }
  );

  // Add blobs to button
  btn.prepend(blobBottom, blobTop);

  // Optional: hover glow
  btn.addEventListener('mouseenter', () => {
    blobTop.style.filter = 'blur(6px) saturate(1.3)';
    blobBottom.style.filter = 'blur(6px) saturate(1.3)';
  });
  btn.addEventListener('mouseleave', () => {
    blobTop.style.filter = 'blur(8px)';
    blobBottom.style.filter = 'blur(8px)';
  });

/* Pure JS SplitText (self-contained)
   Drop this once near the end of <body>. It will animate any element with class "split-text".
*/
(function () {
  // helpers
  const toNum = (v, fallback = 0) => {
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const parseBool = (v, fallback = true) => {
    if (v == null) return fallback;
    return !(v === 'false' || v === '0');
  };

  const defaultOptions = {
    split: 'chars',
    delay: 100,
    duration: 600,
    ease: 'ease-out',
    fromY: 40,
    fromOpacity: 0,
    toY: 0,
    toOpacity: 1,
    threshold: 0.1,
    rootMargin: '-100px',
    once: true
  };

  function initSplitText(root = document) {
    const nodes = root.querySelectorAll('.split-text');
    nodes.forEach(initNode);
  }

  function initNode(el) {
    if (el._splitInitialized) return;
    el._splitInitialized = true;

    const opts = Object.assign({}, defaultOptions, {
      split: (el.getAttribute('data-split') || defaultOptions.split).trim(),
      delay: toNum(el.getAttribute('data-delay'), defaultOptions.delay),
      duration: toNum(el.getAttribute('data-duration'), defaultOptions.duration),
      ease: el.getAttribute('data-ease') || defaultOptions.ease,
      fromY: toNum(el.getAttribute('data-from-y'), defaultOptions.fromY),
      fromOpacity: toNum(el.getAttribute('data-from-opacity'), defaultOptions.fromOpacity),
      toY: toNum(el.getAttribute('data-to-y'), defaultOptions.toY),
      toOpacity: toNum(el.getAttribute('data-to-opacity'), defaultOptions.toOpacity),
      threshold: parseFloat(el.getAttribute('data-threshold') || defaultOptions.threshold),
      rootMargin: el.getAttribute('data-root-margin') || defaultOptions.rootMargin,
      once: parseBool(el.getAttribute('data-once'), defaultOptions.once)
    });

    // Layout guard so animations and line-splitting behave consistently
    el.style.whiteSpace = 'normal';
    el.style.display = el.style.display || 'inline-block';
    el.style.overflow = 'hidden';

    const original = el.textContent;
    if (!original) return;

    const container = document.createElement('span');
    container.className = 'split-parent';
    container.style.display = 'inline-block';
    container.style.width = '100%';
    container.style.whiteSpace = 'normal';

    el.textContent = '';
    container.textContent = original;
    el.appendChild(container);

    requestAnimationFrame(() => {
      const items = splitInto(container, opts.split);
      items.forEach(item => {
        item.style.display = item.style.display || 'inline-block';
        item.style.willChange = 'transform, opacity';
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            playAnimation(items, opts);
            if (opts.once) observer.disconnect();
          }
        });
      }, { threshold: opts.threshold, rootMargin: opts.rootMargin });

      observer.observe(el);
    });
  }

  function splitInto(container, mode = 'chars') {
    const text = container.textContent;
    container.innerHTML = '';
    if (mode === 'chars') {
      const frag = document.createDocumentFragment();
      for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'split-char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        frag.appendChild(span);
      }
      container.appendChild(frag);
      return Array.from(container.querySelectorAll('.split-char'));
    }

    if (mode === 'words') {
      const tokens = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      tokens.forEach(tok => {
        const span = document.createElement('span');
        span.className = tok.trim() === '' ? 'split-space' : 'split-word';
        span.textContent = tok === ' ' ? '\u00A0' : tok;
        span.style.display = 'inline-block';
        frag.appendChild(span);
      });
      container.appendChild(frag);
      return Array.from(container.querySelectorAll('.split-word, .split-space'));
    }

    // lines: wrap words, measure offsetTop, group into lines
    const tokens = text.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    tokens.forEach(tok => {
      const span = document.createElement('span');
      span.className = tok.trim() === '' ? 'split-space' : 'split-word';
      span.textContent = tok === ' ' ? '\u00A0' : tok;
      span.style.display = 'inline-block';
      frag.appendChild(span);
    });
    container.appendChild(frag);

    const words = Array.from(container.querySelectorAll('.split-word, .split-space'));
    const linesMap = new Map();
    words.forEach(w => {
      const top = Math.round(w.offsetTop);
      if (!linesMap.has(top)) linesMap.set(top, []);
      linesMap.get(top).push(w);
    });

    const lines = [];
    linesMap.forEach(nodes => {
      const wrapper = document.createElement('span');
      wrapper.className = 'split-line';
      wrapper.style.display = 'inline-block';
      nodes.forEach(n => wrapper.appendChild(n.cloneNode(true)));
      lines.push(wrapper);
    });

    container.innerHTML = '';
    lines.forEach(l => container.appendChild(l));
    return Array.from(container.querySelectorAll('.split-line'));
  }

  function playAnimation(items, opts) {
    if (items._animated) return (items._animated = true);
    items._animated = true;

    items.forEach((node, i) => {
      node.style.opacity = String(opts.fromOpacity);
      node.style.transform = `translateY(${opts.fromY}px)`;

      const delay = opts.delay * i;
      const keyframes = [
        { transform: `translateY(${opts.fromY}px)`, opacity: opts.fromOpacity },
        { transform: `translateY(${opts.toY}px)`, opacity: opts.toOpacity }
      ];

      node.animate(keyframes, {
        duration: opts.duration,
        easing: opts.ease,
        delay: delay,
        fill: 'forwards'
      });
    });
  }

  // auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSplitText(document));
  } else {
    initSplitText(document);
  }

  // expose a small API if you want to trigger on-demand
  window.PureSplitText = {
    init: initSplitText
  };
})();

//Text Type Animation
// Text Type Animation - plain JS (one-time typed text + centered)
// Paste this script at the end of <body> or include as external file with defer.

(function () {
  'use strict';

  /* ---------- Inject minimal styles (so this file is standalone) ---------- */
  const injectedCSS = `
  /* Container / typed text */
  .tt-text { display:inline-block; white-space:pre-wrap; font-family: inherit; }
  .tt-cursor { display:inline-block; margin-left:0.35rem; font-weight:600; vertical-align:bottom; }
  @keyframes tt-blink {
    0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; }
  }
  .tt-cursor.hidden { visibility: hidden; }
  .tt-fade { opacity: 0; transform: translateY(4px); transition: opacity .42s ease, transform .42s ease; }
  .tt-fade.visible { opacity: 1; transform: none; }
  `;

  function injectStyles() {
    if (document.getElementById('texttype-injected-styles')) return;
    const s = document.createElement('style');
    s.id = 'texttype-injected-styles';
    s.type = 'text/css';
    s.appendChild(document.createTextNode(injectedCSS));
    document.head.appendChild(s);
  }

  /* ---------- Helpers ---------- */
  function safeJSONParse(s, fallback) {
    try { return JSON.parse(s); } catch (e) { return fallback; }
  }
  function strToBool(s, fallback = false) {
    if (s === undefined) return fallback;
    return String(s) === 'true';
  }

  /* ---------- TextType class (pure JS) ---------- */
  class TextType {
    constructor(container) {
      this.container = container;
      this.cfg = this.readConfig();
      this.texts = this.parseTexts(this.cfg.dataText);
      this.cursorEl = null;
      this.textEl = null;

      // state
      this.displayed = '';
      this.charIndex = 0;
      this.isDeleting = false;
      this.textIndex = 0;
      this.running = false;
      this.visible = !this.cfg.startOnVisible;

      this.init();
    }

    readConfig() {
      const d = this.container.dataset || {};
      const oneTimeFlag = strToBool(d.oneTime, false);
      // If one-time requested, force loop false
      const loopVal = oneTimeFlag ? false : strToBool(d.loop, true);

      return {
        dataText: d.text || '["Hello from TextType"]',
        typingSpeed: Number(d.typingSpeed ?? 50),
        deletingSpeed: Number(d.deletingSpeed ?? 30),
        initialDelay: Number(d.initialDelay ?? 0),
        pauseDuration: Number(d.pauseDuration ?? 2000),
        loop: loopVal,
        showCursor: strToBool(d.showCursor, true),
        hideCursorWhileTyping: strToBool(d.hideCursorWhileTyping, false),
        cursorChar: d.cursorChar ?? '|',
        cursorBlinkDuration: Number(d.cursorBlinkDuration ?? 0.5),
        textColors: safeJSONParse(d.textColors ?? '[]', []),
        variableSpeed: safeJSONParse(d.variableSpeed ?? 'null', null),
        startOnVisible: strToBool(d.startOnVisible, false),
        reverse: strToBool(d.reverse, false),
        oneTime: oneTimeFlag
      };
    }

    parseTexts(raw) {
      if (!raw) return [''];
      const trimmed = String(raw).trim();
      // try JSON array first
      const parsed = safeJSONParse(trimmed, null);
      if (Array.isArray(parsed)) return parsed.map(String);
      // fallback: pipe-separated "||"
      if (trimmed.includes('||')) return trimmed.split('||').map(s => s.trim());
      return [trimmed];
    }

    getCurrentColor() {
      const arr = this.cfg.textColors || [];
      if (!arr.length) return '';
      return arr[this.textIndex % arr.length];
    }

    randomSpeed() {
      const v = this.cfg.variableSpeed;
      if (!v || typeof v.min !== 'number' || typeof v.max !== 'number') return this.cfg.typingSpeed;
      return Math.random() * (v.max - v.min) + v.min;
    }

    init() {
      injectStyles();
      this.setupDOM();
      this.setupObserver();
      if (!this.cfg.startOnVisible) this.start();
    }

    setupDOM() {
      // create text span and cursor
      this.textEl = document.createElement('span');
      this.textEl.className = 'tt-text tt-fade';
      const color = this.getCurrentColor();
      if (color) this.textEl.style.color = color;

      this.cursorEl = document.createElement('span');
      this.cursorEl.className = 'tt-cursor';
      this.cursorEl.textContent = this.cfg.cursorChar;
      // blink animation via inline style so duration is configurable
      this.cursorEl.style.animation = `tt-blink ${this.cfg.cursorBlinkDuration}s step-end infinite`;

      // append
      // clear container to ensure only typed content is present
      this.container.innerHTML = '';
      // ensure centered alignment (in case user didn't add classes)
      this.container.style.textAlign = 'center';
      // optional: preserve your utility classes (container may already have Tailwind classes)
      this.container.appendChild(this.textEl);
      if (this.cfg.showCursor) this.container.appendChild(this.cursorEl);

      // ensure container visible (in case CSS hid it)
      this.container.style.visibility = 'visible';
    }

    setupObserver() {
      if (!this.cfg.startOnVisible) return;
      if (!('IntersectionObserver' in window)) {
        // fallback: start immediately
        this.visible = true;
        this.start();
        return;
      }
      const obs = new IntersectionObserver(entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            this.visible = true;
            this.start();
            obs.disconnect();
            break;
          }
        }
      }, { threshold: 0.1 });
      obs.observe(this.container);
    }

    start() {
      if (this.running) return;
      this.running = true;
      // show fade-in
      requestAnimationFrame(() => {
        this.textEl.classList.add('visible');
      });
      setTimeout(() => this.tick(), this.cfg.initialDelay);
    }

    tick() {
      if (!this.running) return;
      const raw = this.texts[this.textIndex] || '';
      const currentText = this.cfg.reverse ? raw.split('').reverse().join('') : raw;

      // handle hide cursor while typing
      const shouldHideCursor = this.cfg.hideCursorWhileTyping &&
        ((!this.isDeleting && this.charIndex < currentText.length) || this.isDeleting);
      if (this.cursorEl) {
        if (shouldHideCursor) this.cursorEl.classList.add('hidden');
        else this.cursorEl.classList.remove('hidden');
      }

      if (this.isDeleting) {
        // deleting
        if (this.displayed.length === 0) {
          // finished deleting: emit event, next index or stop
          const prev = this.textIndex;
          this.isDeleting = false;
          const event = new CustomEvent('texttype:sentenceComplete', {
            detail: { text: this.texts[prev], index: prev }
          });
          this.container.dispatchEvent(event);

          if (this.textIndex === this.texts.length - 1 && !this.cfg.loop) {
            // stop
            this.running = false;
            if (this.cursorEl) this.cursorEl.style.visibility = 'visible';
            return;
          }
          this.textIndex = (this.textIndex + 1) % this.texts.length;
          this.charIndex = 0;
          // update color
          const c = this.getCurrentColor();
          if (c) this.textEl.style.color = c;
          // brief pause
          setTimeout(() => this.tick(), 220);
          return;
        }
        // remove char
        this.displayed = this.displayed.slice(0, -1);
        this.textEl.textContent = this.displayed;
        setTimeout(() => this.tick(), this.cfg.deletingSpeed);
        return;
      }

      // typing mode
      if (this.charIndex < currentText.length) {
        const speed = this.cfg.variableSpeed ? this.randomSpeed() : this.cfg.typingSpeed;
        this.displayed += currentText[this.charIndex];
        this.textEl.textContent = this.displayed;
        this.charIndex += 1;
        setTimeout(() => this.tick(), Math.max(12, Math.round(speed)));
        return;
      }

      // finished typing current sentence
      // If one-time or loop is false for single sentence => stop here and keep text visible
      if (this.texts.length === 1 && !this.cfg.loop) {
        const ev = new CustomEvent('texttype:sentenceComplete', {
          detail: { text: this.texts[this.textIndex], index: this.textIndex }
        });
        this.container.dispatchEvent(ev);
        // ensure cursor remains visible (or hide if you want)
        if (this.cursorEl) {
          // keep cursor blinking — if you prefer to hide cursor after finish, uncomment next line:
          // this.cursorEl.style.display = 'none';
          this.cursorEl.style.visibility = 'visible';
        }
        this.running = false;
        return;
      }

      // pause then delete (or cycle) after pauseDuration
      setTimeout(() => {
        if (this.texts.length > 1 || this.cfg.loop) {
          this.isDeleting = true;
          this.charIndex = currentText.length;
          this.tick();
        } else {
          // single sentence and loop true -> delete
          if (this.cfg.loop) {
            this.isDeleting = true;
            this.charIndex = currentText.length;
            this.tick();
          } else {
            // done
            const ev = new CustomEvent('texttype:sentenceComplete', {
              detail: { text: this.texts[this.textIndex], index: this.textIndex }
            });
            this.container.dispatchEvent(ev);
            this.running = false;
          }
        }
      }, this.cfg.pauseDuration);
    }
  }

  /* ---------- Auto-init logic ---------- */
  function findTargetElement() {
    // prefer id #heroTyping, then .text-type-wrapper, else create default.
    let el = document.getElementById('heroTyping');
    if (!el) el = document.querySelector('.text-type-wrapper');
    if (!el) {
      // create default container (insert at top)
      el = document.createElement('div');
      el.id = 'heroTyping';
      el.className = 'text-type-wrapper';
      // default inline dataset (we'll put a simple fallback)
      el.dataset.text = '["The AI Assistant makes understanding visual comparisons effortless.","You can ask questions, get instant explanations, and uncover the meaning behind every detected change."]';
      // Insert before first child of body
      if (document.body.firstChild) document.body.insertBefore(el, document.body.firstChild);
      else document.body.appendChild(el);
    }
    return el;
  }

  function initAll() {
    injectStyles();
    // treat each matching element as its own instance
    const candidates = [];
    const byId = document.getElementById('heroTyping');
    if (byId) candidates.push(byId);
    document.querySelectorAll('.text-type-wrapper').forEach(node => {
      if (!candidates.includes(node)) candidates.push(node);
    });
    // if none found, create default target (already handled by findTargetElement)
    if (!candidates.length) candidates.push(findTargetElement());

    candidates.forEach(el => {
      if (el.__ttInstance) return;
      el.__ttInstance = new TextType(el);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  // expose API
  window.TextTypeJS = {
    init: initAll,
    createOn: function (elOrSelector) {
      const el = (typeof elOrSelector === 'string') ? document.querySelector(elOrSelector) : elOrSelector;
      if (!el) throw new Error('target not found');
      if (el.__ttInstance) return el.__ttInstance;
      el.__ttInstance = new TextType(el);
      return el.__ttInstance;
    }
  };

})(); 

document.addEventListener("DOMContentLoaded", function () {
  const el = document.getElementById("heroTyping");
  if (!el) return;

  el.addEventListener("texttype:sentenceComplete", function () {
    const styledParagraph = `
      <p class="text-neutral-300 text-xl leading-relaxed w-full text-center md:text-center">
        <b>
          The <span style="color: rgb(231, 231, 83);"><i>AI Assistant</i></span>
          makes understanding visual comparisons effortless through
          <span style="color: rgb(91, 225, 64);">Natural &amp; Human-like</span> conversations.
        </b>
        <br>
        You can ask questions, get
        <span style="color: rgb(241, 64, 64);"><i>instant explanations</i></span>,
        and uncover the meaning behind every detected change with complete confidence.
        Whenever confusion arises in your project, the assistant is always ready to respond instantly turning
        <span style="color: rgb(114, 232, 90);">complex insights</span> into clear,
        <span style="color: rgb(231, 231, 83);">actionable</span> understanding.
      </p>
    `;

    // Replace the typed text with the full styled HTML
    el.innerHTML = styledParagraph;
  });
});// end IIFE


/* PURE JAVASCRIPT BLUR TEXT ANIMATION */
(function () {
  const toNum = (v, fallback) => {
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  function initAll() {
    document.querySelectorAll('.blur-text-js').forEach(initOne);
  }

  function initOne(el) {
    if (el._pureBlurInit) return;
    el._pureBlurInit = true;

    const animateBy = (el.getAttribute('data-animate-by') || 'words').trim();
    // default stagger smaller so words appear smoothly
    const delayMs = toNum(el.getAttribute('data-delay'), 50);
    // longer per-step duration for a softer transition
    const stepDurationSec = toNum(el.getAttribute('data-step-duration'), 0.8);
    const direction = (el.getAttribute('data-direction') || 'top').trim();
    const threshold = parseFloat(el.getAttribute('data-threshold') || 0.1);
    const rootMargin = el.getAttribute('data-root-margin') || '0px';
    // friendly easing by default
    const ease = el.getAttribute('data-ease') || 'cubic-bezier(0.22,1,0.36,1)';
    const once = (el.getAttribute('data-once') || 'true') !== 'false';

    // gentler from snapshot: less blur, smaller translation
    const fromSnapshot = (direction === 'top')
      ? { filter: 'blur(8px)', opacity: 0, y: -20 }
      : { filter: 'blur(8px)', opacity: 0, y: 20 };

    // smoother intermediate steps
    const toSnapshots = [
      { filter: 'blur(4px)', opacity: 0.6, y: direction === 'top' ? 6 : -6 },
      { filter: 'blur(0px)', opacity: 1, y: 0 }
    ];

    const text = (el.textContent || '').trim();
    if (!text) return;

    const container = document.createElement('span');
    container.className = 'pure-blur-container';
    container.style.display = 'inline';
    container.style.whiteSpace = 'normal';
    el.textContent = '';
    container.textContent = text;
    el.appendChild(container);

    function splitInto(mode) {
      const t = container.textContent;
      container.innerHTML = '';
      const frag = document.createDocumentFragment();

      if (mode === 'chars') {
        for (const ch of t) {
          const s = document.createElement('span');
          s.className = 'pure-blur-seg';
          s.textContent = ch === ' ' ? '\u00A0' : ch;
          s.style.display = 'inline-block';
          s.style.willChange = 'filter, transform, opacity';
          frag.appendChild(s);
        }
        container.appendChild(frag);
        return Array.from(container.querySelectorAll('.pure-blur-seg'));
      }

      const tokens = t.split(/(\s+)/);
      tokens.forEach(tok => {
        const s = document.createElement('span');
        s.className = tok.trim() === '' ? 'pure-blur-space' : 'pure-blur-seg';
        s.textContent = tok === ' ' ? '\u00A0' : tok;
        s.style.display = 'inline-block';
        s.style.willChange = 'filter, transform, opacity';
        frag.appendChild(s);
      });
      container.appendChild(frag);
      return Array.from(container.querySelectorAll('.pure-blur-seg, .pure-blur-space'));
    }

    function buildKeyframes(from, steps) {
      const frames = [from, ...steps];
      return frames.map(frame => {
        const k = {};
        if ('filter' in frame) k.filter = frame.filter;
        if ('opacity' in frame) k.opacity = frame.opacity;
        if ('y' in frame) k.transform = `translateY(${frame.y}px)`;
        return k;
      });
    }

    requestAnimationFrame(() => {
      const items = splitInto(animateBy === 'chars' ? 'chars' : 'words');
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run(items);
            if (once) io.disconnect();
          }
        }
      }, { threshold, rootMargin });
      io.observe(el);
    });

    function run(items) {
      const keyframes = buildKeyframes(fromSnapshot, toSnapshots);
      const stepCount = keyframes.length;
      const totalDurationMs = Math.round(stepDurationSec * 1000 * (stepCount - 1)) || 1;

      items.forEach((node, i) => {
        if (node._pureBlurDone) return;
        node._pureBlurDone = true;

        // apply initial state immediately to prevent flash
        node.style.opacity = String(fromSnapshot.opacity ?? 0);
        node.style.filter = fromSnapshot.filter ?? 'none';
        node.style.transform = `translateY(${fromSnapshot.y ?? 0}px)`;

        // progressive, smooth stagger (using ease-friendly offset)
        const delay = i * delayMs;

        // use Web Animations API with friendly easing and forwards fill
        node.animate(keyframes, {
          duration: totalDurationMs,
          easing: ease,
          delay: delay,
          fill: 'forwards'
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.PureBlurText = { init: initAll };
})();

// ----------True Focus Text Animation---------
function createTrueFocus(containerId, sentence, opts = {}) {
  // default options
  const cfg = Object.assign({
    blurPx: 5,
    borderColor: 'white',
    glowColor: 'rgb(4,4,4)',
    duration: 0.5,
    pause: 1.0
  }, opts);

  const container = document.getElementById(containerId);
  if (!container) return null;

  // prepare container
  container.style.position = 'relative';
  container.style.display = 'inline-flex';
  container.style.gap = '0.6rem';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.flexWrap = 'wrap';

  // split words and create spans
  const words = sentence.split(' ').filter(Boolean);
  const wordEls = [];
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.textContent = w;
    s.style.filter = `blur(${cfg.blurPx}px)`;
    s.style.transition = `filter ${cfg.duration}s ease`;
    s.style.fontWeight = '900';
    s.style.cursor = 'pointer';
    container.appendChild(s);
    // hover (for manual override if you want later)
    s.addEventListener('mouseenter', () => focusIndex(i));
    wordEls.push(s);
  });

  // focus box
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    borderRadius: '10px',
    opacity: '0',
    transition: `transform ${cfg.duration}s ease, width ${cfg.duration}s ease, height ${cfg.duration}s ease, opacity ${cfg.duration}s ease`,
    background: `radial-gradient(circle at center, rgba(255,255,255,0.2), transparent 70%)`,
    boxShadow: `0 0 22px ${cfg.glowColor}`
  });

  // corners
  function makeCorner(pos) {
    const c = document.createElement('span');
    Object.assign(c.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      borderWidth: '3px',
      borderStyle: 'solid',
      borderColor: cfg.borderColor,
      borderRadius: '3px',
      filter: `drop-shadow(0 0 6px ${cfg.glowColor})`
    });
    if (pos === 'tl') { c.style.top='-7px'; c.style.left='-7px'; c.style.borderRight='0'; c.style.borderBottom='0'; }
    if (pos === 'tr') { c.style.top='-7px'; c.style.right='-7px'; c.style.borderLeft='0'; c.style.borderBottom='0'; }
    if (pos === 'bl') { c.style.bottom='-7px'; c.style.left='-7px'; c.style.borderRight='0'; c.style.borderTop='0'; }
    if (pos === 'br') { c.style.bottom='-7px'; c.style.right='-7px'; c.style.borderLeft='0'; c.style.borderTop='0'; }
    return c;
  }
  box.append(makeCorner('tl'), makeCorner('tr'), makeCorner('bl'), makeCorner('br'));
  container.appendChild(box);

  // state
  let current = 0;
  let intervalId = null;

  function calcAndPosition(i) {
    if (!wordEls[i]) return;
    const parentRect = container.getBoundingClientRect();
    const rect = wordEls[i].getBoundingClientRect();
    const padX = Math.round(Math.max(8, rect.width * 0.08));
    const padY = Math.round(Math.max(6, rect.height * 0.12));
    const x = Math.round(rect.left - parentRect.left - padX);
    const y = Math.round(rect.top - parentRect.top - padY);
    const w = Math.round(rect.width + padX * 2);
    const h = Math.round(rect.height + padY * 2);
    box.style.transform = `translate(${x}px, ${y}px)`;
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.opacity = '1';
  }

  function focusIndex(i) {
    if (i < 0 || i >= wordEls.length) return;
    current = i;
    wordEls.forEach((el, idx) => {
      el.style.filter = (idx === current) ? 'blur(0px)' : `blur(${cfg.blurPx}px)`;
    });
    calcAndPosition(current);
  }

  function cycle() {
    current = (current + 1) % wordEls.length;
    focusIndex(current);
  }

  // start auto cycle
  focusIndex(0);
  intervalId = setInterval(cycle, (cfg.duration + cfg.pause) * 1000);

  // responsive recalculation
  let raf = null;
  window.addEventListener('resize', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => calcAndPosition(current));
  });

  // API to control externally if needed
  return {
    focusIndex,
    start: () => {
      if (!intervalId) intervalId = setInterval(cycle, (cfg.duration + cfg.pause) * 1000);
    },
    stop: () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } },
    destroy: () => {
      if (intervalId) clearInterval(intervalId);
      // remove created nodes (words + box)
      wordEls.forEach(el => el.remove());
      box.remove();
    }
  };
}

/* -----------------------------------------
   Initialize for your two headings
   - Heading 1: existing element with id "true-focus-heading"
   - Heading 2: new element with id "true-focus-heading-2"
   ----------------------------------------- */

// Example call for existing heading (keep sentence in sync with DOM content if you want)
createTrueFocus('true-focus-heading', 'Image Compare Portal', {
  blurPx: 5,
  borderColor: 'white',
  glowColor: 'rgba(4,4,4,0.55)',
  duration: 0.5,
  pause: 1
});

// New heading: Image Time-Series Portal
createTrueFocus('true-focus-heading-2', 'Image Time-Series Portal', {
  blurPx: 5,
  borderColor: 'white',
  glowColor: 'rgba(4,4,4,0.55)',
  duration: 0.5,
  pause: 1
});