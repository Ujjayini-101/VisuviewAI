//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCwvSsw0veLp_uWD8S3p34BuuTr_Im6s5M",
  authDomain: "visuviewai.firebaseapp.com",
  projectId: "visuviewai",
  storageBucket: "https://visuviewai.firebasestorage.app",
  messagingSenderId: "754944272615",
  appId: "1:754944272615:web:a500e998a21abacb161a42"
};
// initialize firebase app (will be used by the auth script)
firebase.initializeApp(firebaseConfig);

/* ===== Auth modal (SignUp / Login) controller with canvas wave (fixed resize) ===== */
/* ===== Replaces previous IIFE — includes Firebase Google sign-in and backend wiring ===== */
(function () {
  const toggleBtn = document.getElementById('authToggleBtn');
  const overlay = document.getElementById('authOverlay');
  const overlayInner = document.getElementById('authOverlayInner'); // container for card
  const backdropBtn = document.getElementById('authOverlayBackdrop');
  const closeBtn = document.getElementById('authCloseBtn');

  const tabSignUp = document.getElementById('tabSignUp');
  const tabLogin = document.getElementById('tabLogin');
  const signUpForm = document.getElementById('signUpForm');
  const loginForm = document.getElementById('loginForm');
  const switchToLoginInline = document.getElementById('switchToLoginInline');
  const switchToSignUpInline = document.getElementById('switchToSignUpInline');

  // Google buttons
  const signUpGoogleBtn = document.getElementById('signUpGoogleBtn');
  const loginGoogleBtn = document.getElementById('loginGoogleBtn');

  // wave element and card
  const authWaves = document.getElementById('authWaves'); // wrapper div
  // select any element that holds the 'auth-wave' class (svg or canvas)
  const authWaveEl = authWaves ? authWaves.querySelector('.auth-wave') : null;
  const card = document.getElementById('authCard');

  if (!toggleBtn || !overlay || !card || !authWaves || !authWaveEl) {
    console.warn('Auth modal or waves not found — skipping modal/wave init.');
    return;
  }

  //
  // -------------------- START: ADDED AUTH HELPERS & CONFIG --------------------
  //

  // Backend base (change to your deployed backend in production)
  const API_BASE = 'http://localhost:3000/api';

  // helper: post JSON
  async function postJson(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw data;
    return data;
  }

  // helper: save tokens to localStorage
  function saveAuth(data) {
    if (!data) return;
    localStorage.setItem('vv_idToken', data.idToken || '');
    localStorage.setItem('vv_refreshToken', data.refreshToken || '');
    localStorage.setItem('vv_user_email', data.email || '');
    if (data.name) localStorage.setItem('vv_user_name', data.name);
    if (data.photoURL) localStorage.setItem('vv_user_photo', data.photoURL);
    else localStorage.removeItem('vv_user_photo');
    if (data.expiresIn) {
      const expMs = Date.now() + parseInt(data.expiresIn, 10) * 1000;
      localStorage.setItem('vv_token_exp', String(expMs));
    }
  }

  // helper: clear auth
  function clearAuth() {
    localStorage.removeItem('vv_idToken');
    localStorage.removeItem('vv_refreshToken');
    localStorage.removeItem('vv_user_email');
    localStorage.removeItem('vv_token_exp');
    // keep name/photo removal to explicit logout flows if desired
  }

  // function to update UI after login (simple example)
  // function to update UI after login (simple example)
  function updateAuthUiAfterLogin() {
    // 1) close modal
    closeModal();

    // 2) DO NOT set navbar button text here — avatar renderer will handle the button fully.
    // if (toggleBtn) toggleBtn.innerText = 'Account'; // <-- remove this line

    // 3) show user email in console (or update a user UI element)
    const email = localStorage.getItem('vv_user_email');
    if (email) console.log('Logged in as', email);

    // trigger avatar render if available
    if (typeof window.vvRenderAuthToggle === 'function') window.vvRenderAuthToggle();
  }


  // Sign-out helper that clears both client and backend session (if any)
  // Sign-out helper that clears both client and backend session (if any)
  async function signOut() {
    try {
      if (window.firebase && firebase.auth) {
        await firebase.auth().signOut();
      }
    } catch (e) {
      console.warn('Firebase signOut error', e);
    }

    // clear client keys
    localStorage.removeItem('vv_idToken');
    localStorage.removeItem('vv_refreshToken');
    localStorage.removeItem('vv_user_email');
    localStorage.removeItem('vv_user_name');
    localStorage.removeItem('vv_user_photo');
    localStorage.removeItem('vv_token_exp');

    // restore original navbar button text & visual
    // after clearing tokens
    const toggleBtn = document.getElementById('authToggleBtn');
    if (toggleBtn) {
      toggleBtn.classList.remove('vv-avatar-active'); // remove neutralization
      toggleBtn.innerText = 'Login / Sign Up';
      // clear inline styles to let Tailwind classes show
      toggleBtn.style.background = '';
      toggleBtn.style.boxShadow = '';
      toggleBtn.style.padding = '';
    }

  }

  //
  // -------------------- END: ADDED AUTH HELPERS & CONFIG --------------------
  //

  // Utility: show overlay as flex (remove hidden, add flex)
  function showOverlay() {
    overlay.classList.remove('hidden');
    overlay.classList.add('flex', 'items-center', 'justify-center'); // ensure centering
    overlay.setAttribute('aria-hidden', 'false');
    overlay.style.zIndex = '99999';
  }

  // Utility: hide overlay (remove flex, add hidden)
  function hideOverlay() {
    overlay.classList.remove('flex', 'items-center', 'justify-center');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  // Open modal: animate waves up first, then reveal card
  function openModal(defaultTab = 'signup') {
    showOverlay();
    document.body.style.overflow = 'hidden'; // prevent background scroll

    // reset states
    card.classList.remove('show', 'hide');
    authWaveEl.classList.remove('show');
    void authWaveEl.offsetWidth; // force reflow

    // set requested tab
    if (defaultTab === 'login') setTab('login');
    else setTab('signup');

    // animate waves up by adding .show to the "auth-wave" element (canvas uses same class)
    authWaveEl.classList.add('show');

    // IMPORTANT SAFE RESIZE: call canvas._resize() after overlay has become visible.
    const c = document.getElementById('authWavesCanvas');
    if (c && typeof c._resize === 'function') {
      // wait a couple frames so CSS visibility/transform/layout completes
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          c._resize();
        });
      });
    } // else: we no longer dispatch a global resize (avoid unexpected side-effects)

    // after waves are mostly up, reveal card
    const cardDelay = 320; // ms (matches CSS transitions)
    setTimeout(() => {
      card.classList.add('show');
      // focus first form field shortly after card visible
      setTimeout(() => {
        const first = overlay.querySelector('form input');
        if (first) first.focus();
      }, 140);
    }, cardDelay);
  }

  // Close modal: reverse order (card hide then waves down then hide overlay)
  function closeModal() {
    // hide card first
    card.classList.remove('show');
    card.classList.add('hide');

    // after card transition finishes, hide waves and then overlay
    const hideCardDelay = 240;
    setTimeout(() => {
      // remove show from wave element so it slides down
      authWaveEl.classList.remove('show');

      // small delay to let waves slide down
      setTimeout(() => {
        hideOverlay();
        // cleanup classes
        card.classList.remove('hide');
        card.classList.remove('show');
        authWaveEl.classList.remove('show');
        document.body.style.overflow = '';
      }, 260);
    }, hideCardDelay);
  }

  function setTab(which) {
    if (!tabSignUp || !tabLogin || !signUpForm || !loginForm) return;
    if (which === 'login') {
      tabLogin.classList.add('bg-red-600', 'shadow-[0_6px_20px_-10px_rgba(239,68,68,0.45)]');
      tabLogin.classList.remove('bg-white/10');
      tabSignUp.classList.remove('bg-red-600', 'shadow-[0_6px_20px_-10px_rgba(239,68,68,0.45)]');
      tabSignUp.classList.add('bg-white/10');

      signUpForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    } else {
      tabSignUp.classList.add('bg-red-600', 'shadow-[0_6px_20px_-10px_rgba(239,68,68,0.45)]');
      tabSignUp.classList.remove('bg-white/10');
      tabLogin.classList.remove('bg-red-600', 'shadow-[0_6px_20px_-10px_rgba(239,68,68,0.45)]');
      tabLogin.classList.add('bg-white/10');

      loginForm.classList.add('hidden');
      signUpForm.classList.remove('hidden');
    }
  }

  // events
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // If user is logged in, do nothing (prevents login modal from showing when avatar is present)
    if (localStorage.getItem('vv_idToken')) return;
    openModal('signup');
  });

  tabSignUp && tabSignUp.addEventListener('click', (e) => {
    e.preventDefault();
    setTab('signup');
  });
  tabLogin && tabLogin.addEventListener('click', (e) => {
    e.preventDefault();
    setTab('login');
  });

  switchToLoginInline && switchToLoginInline.addEventListener('click', (e) => {
    e.preventDefault();
    setTab('login');
  });
  switchToSignUpInline && switchToSignUpInline.addEventListener('click', (e) => {
    e.preventDefault();
    setTab('signup');
  });

  closeBtn && closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });

  // clicking outside card closes (but clicking card won't)
  backdropBtn && backdropBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });
  overlayInner && overlayInner.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Esc key to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) closeModal();
  });

  //
  // -------------------- START: INTEGRATED FORM HANDLERS --------------------
  //

  // ---- Sign Up form submit handler ----
  signUpForm && signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      // call backend signup
      const resp = await postJson(`${API_BASE}/auth/signup`, { name, email, password });
      saveAuth(resp);
      if (typeof window.vvRenderAuthToggle === 'function') window.vvRenderAuthToggle();
      updateAuthUiAfterLogin();
    } catch (err) {
      console.error('Signup failed', err);
      alert(err.error || 'Signup failed');
    }
  });

  // ---- Login form submit handler ----
  loginForm && loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const resp = await postJson(`${API_BASE}/auth/login`, { email, password });
      saveAuth(resp);
      if (typeof window.vvRenderAuthToggle === 'function') window.vvRenderAuthToggle();
      updateAuthUiAfterLogin();
    } catch (err) {
      console.error('Login failed', err);
      alert(err.error || 'Login failed');
    }
  });

  // ---- Google button handlers (use Firebase client SDK to sign-in, then verify with backend) ----
  async function handleFirebaseGoogleSignIn() {
    try {
      if (!window.firebase || !firebase.auth) {
        alert('Firebase not initialized. Make sure you added the Firebase SDK and firebaseConfig in HTML.');
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      // result.user is a firebase.User
      const user = result.user;
      if (!user) throw new Error('No user from firebase');

      // get ID token
      const idToken = await user.getIdToken();
      // Optionally send to backend verify endpoint to validate & create a session record
      try {
        const verifyResp = await postJson(`${API_BASE}/auth/verifyToken`, { idToken });
        // verifyResp.decoded contains the decoded token (uid/email)
        // Save auth locally (we may not have refreshToken from client, so save idToken + email)
        saveAuth({
          idToken,
          email: user.email,
          expiresIn: 3600,
          photoURL: user.photoURL || '',
          name: user.displayName || ''
        });
        if (typeof window.vvRenderAuthToggle === 'function') window.vvRenderAuthToggle();

        updateAuthUiAfterLogin();
      } catch (vErr) {
        console.warn('backend verify failed', vErr);
        // still sign in on client - but inform user or try again
        saveAuth({
          idToken,
          email: user.email,
          expiresIn: 3600,
          photoURL: user.photoURL || '',
          name: user.displayName || ''
        });
        if (typeof window.vvRenderAuthToggle === 'function') window.vvRenderAuthToggle();

        updateAuthUiAfterLogin();
      }
    } catch (err) {
      console.error('Google sign-in failed', err);
      alert(err.message || 'Google sign-in failed');
    }
  }

  if (signUpGoogleBtn) {
    signUpGoogleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleFirebaseGoogleSignIn();
      // close modal (if you want)
      // closeModal();
    });
  }
  if (loginGoogleBtn) {
    loginGoogleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleFirebaseGoogleSignIn();
      // closeModal();
    });
  }

  //
  // -------------------- END: INTEGRATED FORM HANDLERS --------------------
  //

  // --- expose to global safely (place *inside* the IIFE, after functions are defined) ---
  window.saveAuth = saveAuth;
  window.clearAuth = clearAuth;
  window.signOut = signOut;

  window.auth = {
    isLoggedIn: () => !!localStorage.getItem('vv_idToken'),
    getCurrentUser: () => ({
      email: localStorage.getItem('vv_user_email') || null,
      idToken: localStorage.getItem('vv_idToken') || null,
      name: localStorage.getItem('vv_user_name') || null,
      photoURL: localStorage.getItem('vv_user_photo') || null
    }),
    signOut: signOut,
    saveAuth: saveAuth,
    clearAuth: clearAuth
  };

})(); // end main auth IIFE


/* ======= Avatar + Dropdown (chevron control, mobile-integration) =======
   - Avatar is non-clickable.
   - Desktop: chevron toggles account dropdown; keyboard accessible.
   - Mobile: reuses existing #mobileNavMenu and prepends a user header + Dashboard + Logout
   - Defensive: no changes to other UI when elements missing.
*/
/* ======= Avatar + Dropdown (single-mobile-chevron behavior) =======
   - Mobile: do NOT create any chevron. Inject user header + Dashboard + Logout
     into existing #mobileNavMenu (no second dropdown).
   - Desktop: create one chevron to the right of avatar (remove duplicates first).
   - Avatar is non-clickable; chevron toggles desktop dropdown.
*/
(function vvAvatarDropdownStandalone() {
  const DBG = (...args) => { try { console.log('[vvAvatar]', ...args); } catch(e){} };

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function injectStyles() {
    if (document.getElementById('vv-avatar-styles')) return;
    const css = `
      .vv-avatar-wrap { display:inline-flex; align-items:center; gap:2px; cursor:default; position:relative; }
      .vv-avatar { width:38px; height:38px; border-radius:999px; display:inline-grid; place-items:center; font-weight:600; font-size:14px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.12); user-select:none; background:#4a88ed; color:#fff; }
      .vv-avatar img { width:100%; height:100%; object-fit:cover; display:block; }

/* refined glassy red/black dropdown - better readability */
.vv-dropdown {
  position: absolute;
  min-width: 240px;
  right: 6px;                 /* <- shift to the right; change value as needed */
  top: calc(100% + 8px);

  /* toned-down transparency for better text contrast */
  background: linear-gradient(180deg,
              rgba(18,18,18,0.88) 0%,
              rgba(30,10,10,0.82) 40%,
              rgba(45,10,10,0.78) 70%,
              rgba(239,68,68,0.10) 100%);

  /* lighter blur for subtle glass feel */
  backdrop-filter: blur(4px) saturate(120%);
  -webkit-backdrop-filter: blur(4px) saturate(120%);

  color: #fff;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 12px 30px rgba(0,0,0,0.45), 0 4px 12px rgba(239,68,68,0.06);
  padding: 2px;
  z-index: 100000;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  transform-origin: top right;
  overflow: clip;
}

/* header section */
.vv-dropdown .vv-header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border-radius: 10px;
  margin: 4px;
}

.vv-dropdown .vv-name {
  font-weight: 700;
  font-size: 15px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.45);
  letter-spacing: 0.3px;
}

.vv-dropdown .vv-email {
  font-size: 13px;
  color: #f5caca;
  opacity: 0.98;
  margin-top: 2px;
  word-break: break-word;
}

/* dropdown list */
.vv-dropdown .vv-list {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 6px;
}

.vv-dropdown .vv-item {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  text-decoration: none;
  color: #ffffff;
  cursor: pointer;
  background: transparent;
  border: none;
  text-align: left;
  transition: background 0.14s ease, transform 0.08s ease;
}

/* hover highlight: subtle warm red glow */
.vv-dropdown .vv-item:hover,
.vv-dropdown .vv-item:focus {
  background: linear-gradient(90deg, rgba(239,68,68,0.10), rgba(255,255,255,0.04));
  transform: translateY(-1px);
  outline: none;
}

/* logout button emphasis */
.vv-dropdown .vv-logout {
  color: #F00000;
  font-weight: 800;
}

/* small-screen tweak */
@media (max-width: 420px) {
  .vv-dropdown { min-width: 200px; top: 52px; padding: 6px; }
  .vv-dropdown .vv-header { padding: 10px 12px; margin: 2px; }
}

      /* chevron button (desktop only) */
      .vv-chevron {
        display:inline-grid;
        place-items:center;
        width:36px;
        height:36px;
        border-radius:8px;
        background:transparent;
        border:1px solid rgba(255,255,255,0.06);
        margin-left:4px;
        cursor:pointer;
        transition: transform .12s ease, background .12s ease, box-shadow .12s ease;
        color:#ef4444;
        transform: translateY(4px);
      }
      .vv-chevron:hover { background: rgba(239,68,68,0.12); transform: translateY(-1px) scale(1.02); box-shadow: 0 6px 18px rgba(239,68,68,0.08); }
      .vv-chevron svg { width:18px; height:18px; display:block; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

      /* only neutralize host button when avatar active */
      #authToggleBtn.vv-avatar-active {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        min-width: auto !important;
        height: auto !important;
        border: none !important;
      }
      #authToggleBtn.vv-avatar-active .vv-avatar-wrap {
        padding: 6px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
      }

      /* ensure chevron hidden on small screens (we rely on existing mobile toggle) */
      @media (max-width: 520px) {
        .vv-chevron { display:none !important; }
      }
    `;
    const s = document.createElement('style');
    s.id = 'vv-avatar-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  // Clear UI auth keys (local)
  function clearLocalAuth() {
    localStorage.removeItem('vv_idToken');
    localStorage.removeItem('vv_refreshToken');
    localStorage.removeItem('vv_user_email');
    localStorage.removeItem('vv_user_name');
    localStorage.removeItem('vv_user_photo');
    localStorage.removeItem('vv_token_exp');
    DBG('Cleared local auth keys');
  }

  // Build desktop dropdown DOM (same as before)
  function buildDropdown(name, email, wrap) {
    const dd = document.createElement('div');
    dd.className = 'vv-dropdown';
    dd.setAttribute('role', 'menu');

    const header = document.createElement('div');
    header.className = 'vv-header';
    const nm = document.createElement('div'); nm.className = 'vv-name'; nm.textContent = name || (email ? email.split('@')[0] : 'User');
    const em = document.createElement('div'); em.className = 'vv-email'; em.textContent = email || '';
    header.appendChild(nm); header.appendChild(em);
    dd.appendChild(header);

    const list = document.createElement('div'); list.className = 'vv-list';

    const dash = document.createElement('a');
    dash.className = 'vv-item'; dash.setAttribute('role','menuitem'); dash.setAttribute('tabindex','0');
    dash.href = '/dashboard'; dash.textContent = 'Dashboard';
    dash.addEventListener('click', (ev) => { ev.preventDefault(); closeAll(); setTimeout(()=> location.href = dash.href, 80); });
    list.appendChild(dash);

    const apps = document.createElement('a');
    apps.className = 'vv-item'; apps.setAttribute('role','menuitem'); apps.setAttribute('tabindex','0');
    apps.href = '/apps-settings'; apps.textContent = 'Apps Settings';
    apps.addEventListener('click', (ev) => { ev.preventDefault(); closeAll(); setTimeout(()=> location.href = apps.href, 80); });
    list.appendChild(apps);

    const logout = document.createElement('button');
    logout.className = 'vv-item vv-logout'; logout.setAttribute('role','menuitem'); logout.setAttribute('tabindex','0');
    logout.textContent = 'Logout';
    logout.addEventListener('click', async (ev) => {
      ev.preventDefault();
      DBG('Logout clicked');
      try {
        if (window.auth && typeof window.auth.signOut === 'function') await window.auth.signOut();
        else if (typeof window.signOut === 'function') await window.signOut();
        else if (typeof signOut === 'function') await signOut();
      } catch (err) { DBG('Error in signOut:', err); }
      clearLocalAuth();
      closeAll();
      cleanupAfterLogoutUI();
    });
    list.appendChild(logout);

    dd.appendChild(list);

    function closeAll() {
      const w = wrap;
      if (!w) return;
      const d = w.querySelector('.vv-dropdown');
      if (d) d.style.display = 'none';
      w.setAttribute('aria-expanded','false');
      document.removeEventListener('click', outsideClick);
      window.removeEventListener('keydown', escHandler);
    }
    function outsideClick(e) { if (!wrap.contains(e.target)) closeAll(); }
    function escHandler(e) { if (e.key === 'Escape') closeAll(); }

    dd._closeAll = closeAll;
    return dd;
  }

  // Inject a single user block into existing #mobileNavMenu (top of menu). Idempotent.
  function injectMobileUserSection(name, email) {
    const mobileMenu = document.getElementById('mobileNavMenu');
    if (!mobileMenu) return;
    if (mobileMenu.querySelector('.vv-mobile-user')) return; // already present

    const wrapper = document.createElement('div');
    wrapper.className = 'vv-mobile-user border-b border-red-600/20 px-4 py-3 bg-black/60';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';

    const nm = document.createElement('div');
    nm.textContent = name || (email ? email.split('@')[0] : 'User');
    nm.style.fontWeight = '700';
    nm.style.color = '#e11d48';
    nm.style.fontSize = '14px';

    const em = document.createElement('div');
    em.textContent = email || '';
    em.style.fontSize = '13px';
    em.style.color = '#9ca3af';
    em.style.wordBreak = 'break-word';

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.marginTop = '8px';

    const dash = document.createElement('a');
    dash.textContent = 'Dashboard';
    dash.href = '/dashboard';
    dash.className = 'block px-3 py-2 rounded-md text-sm text-neutral-200';
    dash.style.textDecoration = 'none';
    dash.addEventListener('click', () => { /* default navigation */ });

    const logout = document.createElement('button');
    logout.textContent = 'Logout';
    logout.className = 'block px-3 py-2 rounded-md text-sm text-red-400';
    logout.style.border = 'none';
    logout.style.cursor = 'pointer';
    logout.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        if (window.auth && typeof window.auth.signOut === 'function') await window.auth.signOut();
        else if (typeof window.signOut === 'function') await window.signOut();
        else if (typeof signOut === 'function') await signOut();
      } catch (err) { DBG('Error in mobile logout:', err); }
      clearLocalAuth();
      removeMobileUserSection();
      cleanupAfterLogoutUI();
    });

    controls.appendChild(dash);

    // --- NEW: Apps Settings for mobile menu
   const apps = document.createElement('a');
   apps.textContent = 'Apps Settings';
   apps.href = '/apps-settings';
   apps.className = 'block px-3 py-2 rounded-md text-sm text-neutral-200';
   apps.style.textDecoration = 'none';
   apps.addEventListener('click', () => { /* default navigation */ });

   controls.appendChild(apps);
   controls.appendChild(logout);


    wrapper.appendChild(nm);
    wrapper.appendChild(em);
    wrapper.appendChild(controls);

    // prepend wrapper so it appears above existing links
    mobileMenu.insertBefore(wrapper, mobileMenu.firstChild);
  }

  function removeMobileUserSection() {
    const mobileMenu = document.getElementById('mobileNavMenu');
    if (!mobileMenu) return;
    const existing = mobileMenu.querySelector('.vv-mobile-user');
    if (existing) existing.remove();
  }

  // Remove chevrons / dropdowns and restore login button UI on logout
  function cleanupAfterLogoutUI() {
    const toggleBtn = document.getElementById('authToggleBtn');
    if (toggleBtn) {
      // remove any vv-avatar-wrap and vv-chevron
      const wrap = toggleBtn.querySelector('.vv-avatar-wrap');
      if (wrap) wrap.remove();
      const cv = toggleBtn.querySelector('.vv-chevron');
      if (cv) cv.remove();
      // restore the original label & look
      toggleBtn.classList.remove('vv-avatar-active');
      toggleBtn.innerText = 'Login / Sign Up';
      toggleBtn.style.background = '';
      toggleBtn.style.boxShadow = '';
      toggleBtn.style.padding = '';
    }
  }

  // Helper: remove any desktop extras (chevrons/dropdowns) to avoid duplicates
  function cleanupDesktopExtras() {
    const toggleBtn = document.getElementById('authToggleBtn');
    if (!toggleBtn) return;
    const existingChevron = toggleBtn.querySelector('.vv-chevron');
    if (existingChevron) existingChevron.remove();
    const existingWrap = toggleBtn.querySelector('.vv-avatar-wrap');
    if (existingWrap) {
      const dd = existingWrap.querySelector('.vv-dropdown');
      if (dd) dd.remove();
    }
  }

  // generate deterministic color from user string (email or name)
// Generate deterministic user color + auto text contrast
function getUserColorAndText(identifier) {
  if (!identifier) return { bg: '#374151', text: '#fff' };

  // simple hash
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 60;
  const lightness = 55;
  const bg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // compute brightness to decide text color
  // convert HSL → approximate RGB → brightness
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // gray
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  }

  const [r, g, b] = hslToRgb(h, s, l);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // pick text color based on brightness threshold
  const text = brightness > 160 ? '#111' : '#fff';

  return { bg, text };
}

  // Main render function
  function renderOrRemoveAvatar() {
    const toggleBtn = document.getElementById('authToggleBtn');
    if (!toggleBtn) { DBG('authToggleBtn not found'); return; }

    const mobileMenu = document.getElementById('mobileNavMenu');
    const idToken = localStorage.getItem('vv_idToken');
    const isMobile = window.innerWidth <= 520;

    if (!idToken) {
      // logged out: clean everything
      cleanupDesktopExtras();
      removeMobileUserSection();
      cleanupAfterLogoutUI();
      DBG('Logged out — cleaned avatar & mobile section');
      return;
    }

    // logged in: read user data
    const name = localStorage.getItem('vv_user_name') || '';
    const email = localStorage.getItem('vv_user_email') || '';
    const photo = localStorage.getItem('vv_user_photo') || '';

    // cleanup any previous pieces to avoid duplicates
    cleanupDesktopExtras();
    removeMobileUserSection();

    // create non-clickable avatar element
    const wrap = document.createElement('span');
    wrap.className = 'vv-avatar-wrap';
    wrap.setAttribute('role','img');
    wrap.setAttribute('aria-hidden','true');
    wrap.style.position = 'relative';

    const avatar = document.createElement('span');
    avatar.className = 'vv-avatar';
    if (photo) {
      const img = document.createElement('img'); img.src = photo; img.alt = name || email || 'Avatar'; img.loading='lazy'; avatar.appendChild(img);
    } else {
       const initials = (name || email).split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || 'U';
       avatar.textContent = initials;
       const colorKey = name || email;
       const { bg, text } = getUserColorAndText(colorKey);
       avatar.style.background = bg;
       avatar.style.color = text;
       avatar.style.textShadow = text === '#fff' ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(255,255,255,0.3)';
    }
    avatar.setAttribute('tabindex','-1');
    wrap.appendChild(avatar);

    // MOBILE: do NOT create chevron; inject into mobile menu only
    if (isMobile) {
      toggleBtn.innerText = '';
      toggleBtn.classList.add('vv-avatar-active');
      toggleBtn.style.background = 'transparent';
      toggleBtn.style.boxShadow = 'none';
      toggleBtn.style.padding = '0';
      // attach only avatar (no chevron)
      toggleBtn.appendChild(wrap);

      // inject into mobile menu (single menu)
      injectMobileUserSection(name, email);
      DBG('Mobile logged-in: injected user section into single mobile menu (no extra chevron)');
      return;
    }

        // DESKTOP: create dropdown inside wrap and a single chevron (remove duplicates first)
    const dropdown = buildDropdown(name, email, wrap);
    dropdown.style.display = 'none';

    // ensure the dropdown anchors to the wrap and sits slightly to the right (under chevron)
    // (this inline style overrides sheet's right value so you don't need to edit CSS files)
    dropdown.style.right = '0px';
    dropdown.style.top = 'calc(100% + 8px)';

    wrap.appendChild(dropdown);

    // remove duplicate chevrons if any and append new one
    cleanupDesktopExtras();

    const chevron = document.createElement('button');
    chevron.className = 'vv-chevron';
    chevron.setAttribute('aria-label','Open account menu');
    chevron.setAttribute('aria-expanded','false');
    chevron.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 9l6 6 6-6" /></svg>';

    // open/close helpers for desktop dropdown
    function openDrop() {
      dropdown.style.display = 'block';
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-6px) scale(.98)';
      chevron.setAttribute('aria-expanded','true');
      wrap.setAttribute('aria-expanded','true');
      requestAnimationFrame(() => {
        dropdown.style.transition = 'opacity .18s ease, transform .18s ease';
        dropdown.style.opacity = '1';
        dropdown.style.transform = 'translateY(0) scale(1)';
      });
      setTimeout(()=>{ document.addEventListener('click', outsideClickBound); window.addEventListener('keydown', escBound); }, 6);
    }
    function closeDrop() {
      dropdown.style.transition = 'opacity .12s ease, transform .12s ease';
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-6px) scale(.98)';
      chevron.setAttribute('aria-expanded','false');
      wrap.setAttribute('aria-expanded','false');
      setTimeout(()=> { dropdown.style.display = 'none'; dropdown.style.transition = ''; dropdown.style.transform = ''; dropdown.style.opacity = ''; }, 140);
      document.removeEventListener('click', outsideClickBound); window.removeEventListener('keydown', escBound);
    }
    function toggleDrop(e) { if (dropdown.style.display === 'none') openDrop(); else closeDrop(); }
    function outsideClickBound(e) { if (!wrap.contains(e.target) && e.target !== chevron) closeDrop(); }
    function escBound(e) { if (e.key === 'Escape') closeDrop(); }

    chevron.addEventListener('click', (e) => { e.stopPropagation(); toggleDrop(); });
    chevron.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrop(); } });

    // attach avatar + chevron to the host button — IMPORTANT: append chevron INSIDE wrap
    // (this places avatar, chevron, and dropdown in the same positioned container)
    toggleBtn.innerText = '';
    toggleBtn.classList.add('vv-avatar-active');
    toggleBtn.style.background = 'transparent';
    toggleBtn.style.boxShadow = 'none';
    toggleBtn.style.padding = '0';

    // make sure wrap contains both avatar and chevron (chevron appended to wrap)
    wrap.appendChild(chevron);
    toggleBtn.appendChild(wrap);

    DBG('Desktop logged-in: avatar + single chevron added (dropdown attached)');

  } // renderOrRemoveAvatar end

  // listen storage events and firebase auth state
  function listenStorage() {
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      const keys = ['vv_idToken','vv_user_name','vv_user_email','vv_user_photo','vv_token_exp'];
      if (keys.includes(e.key)) {
        DBG('storage event for', e.key, '— re-rendering avatar');
        renderOrRemoveAvatar();
      }
    });
  }

/* ===== Responsive handler: ensure single mobile chevron + mobile injection ===== */
function handleResponsive() {
  try {
    const isMobileNow = window.innerWidth <= 520;
    // If mobile now, ensure desktop extras are removed and mobile block is injected
    if (isMobileNow) {
      cleanupDesktopExtras(); // removes any vv-chevron / desktop dropdown
      // ensure mobile injected section exists (use current stored user info)
      const name = localStorage.getItem('vv_user_name') || '';
      const email = localStorage.getItem('vv_user_email') || '';
      if (localStorage.getItem('vv_idToken')) {
        // attach avatar to host but do NOT create a new chevron
        const toggleBtn = document.getElementById('authToggleBtn');
        if (toggleBtn && !toggleBtn.querySelector('.vv-avatar-wrap')) {
          // call renderOrRemoveAvatar which in mobile mode attaches only avatar and injects mobile section
          renderOrRemoveAvatar();
        } else {
          // ensure mobile menu contains the user section
          injectMobileUserSection(name, email);
        }
      } else {
        // logged out: ensure mobile user section removed and desktop extras cleaned
        removeMobileUserSection();
        cleanupDesktopExtras();
      }
      return;
    }

    // Desktop now: remove mobile-only section and render desktop avatar + chevron
    removeMobileUserSection();
    // Re-render avatar (will create chevron)
    renderOrRemoveAvatar();
  } catch (err) {
    DBG('handleResponsive error', err);
  }
}

// Debounced resize to avoid thrash
let _rrTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_rrTimer);
  _rrTimer = setTimeout(handleResponsive, 120);
});


  function listenFirebaseAuth() {
    try {
      if (window.firebase && firebase.auth && typeof firebase.auth === 'function') {
        firebase.auth().onAuthStateChanged((user) => {
          DBG('firebase auth state changed', !!user);
          if (user) {
            user.getIdToken().then(token => {
              if (!localStorage.getItem('vv_idToken')) localStorage.setItem('vv_idToken', token || '');
              if (user.email && !localStorage.getItem('vv_user_email')) localStorage.setItem('vv_user_email', user.email);
              if (user.displayName && !localStorage.getItem('vv_user_name')) localStorage.setItem('vv_user_name', user.displayName);
              if (user.photoURL && !localStorage.getItem('vv_user_photo')) localStorage.setItem('vv_user_photo', user.photoURL);
              renderOrRemoveAvatar();
            }).catch(err => { DBG('getIdToken err', err); renderOrRemoveAvatar(); });
          } else {
            renderOrRemoveAvatar();
          }
        });
      } else { DBG('Firebase SDK not found or firebase.auth unavailable'); }
    } catch (e) { DBG('Error attaching firebase listener', e); }
  }

  // expose for manual refresh
  window.vvRenderAuthToggle = function() { renderOrRemoveAvatar(); };

   /* ===== responsive matchMedia guard (put inside vvAvatarDropdownStandalone IIFE) ===== */
(function addMobileMatchGuard(){
  // media query threshold must match your logic
  const mq = window.matchMedia('(max-width: 520px)');

  function onMqChange(e) {
    if (e.matches) {
      // now mobile: remove any desktop extras and ensure mobile section injected
      try {
        cleanupDesktopExtras();      // remove .vv-chevron etc
        removeMobileUserSection();   // clear previous section (idempotent)
        // renderOrRemoveAvatar will attach only avatar and inject mobile section if logged in
        renderOrRemoveAvatar();
      } catch (err) { console.warn('mq->mobile handler err', err); }
    } else {
      // now desktop: remove mobile-only block and render desktop avatar/chevron
      try {
        removeMobileUserSection();
        renderOrRemoveAvatar();
      } catch (err) { console.warn('mq->desktop handler err', err); }
    }
  }

  // initial call + listen for changes
  try {
    mq.addEventListener ? mq.addEventListener('change', onMqChange) : mq.addListener(onMqChange);
    onMqChange(mq);
  } catch (err) {
    console.warn('matchMedia listener failed', err);
  }
})();


  onReady(() => {
  injectStyles();
  // initial render
  renderOrRemoveAvatar();
  // ensure mobile/desktop state is correct immediately
  handleResponsive();
  // listeners
  listenStorage();
  listenFirebaseAuth();
  DBG('vvAvatarDropdownStandalone (single-mobile-chevron) init complete.');
});


})();
