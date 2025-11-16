/**
 * Auth router
 * - POST /signup       { name, email, password } -> creates user via Firebase Auth REST API
 * - POST /login        { email, password } -> signs in user and returns idToken + refreshToken + user
 * - POST /verifyToken  { idToken } -> verifies idToken using firebase-admin and returns decoded token
 *
 * Note: This implementation uses the Firebase Authentication REST API for sign-up/sign-in,
 * and firebase-admin for server-side token verification.
 */

const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
const router = express.Router();

// Load firebase-admin with service account credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
} catch (err) {
  // already initialized in some envs
}

// Config
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
if (!FIREBASE_API_KEY) {
  console.warn('FIREBASE_API_KEY is not set. Sign-in/up endpoints will fail until this is provided.');
}

const ID_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';

// Helper: call Firebase REST API
async function firebaseRest(path, data) {
  const url = `${ID_TOOLKIT_BASE}/${path}?key=${FIREBASE_API_KEY}`;
  const r = await axios.post(url, data, { headers: { 'Content-Type': 'application/json' } });
  return r.data;
}

/**
 * Sign up (create user)
 * Accepts: { name, email, password }
 * Returns: firebase response { idToken, refreshToken, localId, email }
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    // 1) Create account via REST endpoint
    const createResp = await firebaseRest('accounts:signUp', {
      email,
      password,
      returnSecureToken: true
    });

    // 2) Optionally set displayName using update endpoint
    if (name) {
      await firebaseRest('accounts:update', {
        idToken: createResp.idToken,
        displayName: name,
        returnSecureToken: false
      }).catch(() => { /* non-fatal */ });
    }

    // return token + user info to frontend
    return res.json({
      idToken: createResp.idToken,
      refreshToken: createResp.refreshToken,
      expiresIn: createResp.expiresIn,
      localId: createResp.localId,
      email: createResp.email
    });
  } catch (err) {
    console.error('signup error', err?.response?.data || err.message);
    const msg = err?.response?.data?.error?.message || 'SIGNUP_FAILED';
    return res.status(400).json({ error: msg });
  }
});

/**
 * Sign in (email + password)
 * Accepts: { email, password }
 * Returns: { idToken, refreshToken, localId, email, expiresIn }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const signInResp = await firebaseRest('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true
    });

    return res.json({
      idToken: signInResp.idToken,
      refreshToken: signInResp.refreshToken,
      expiresIn: signInResp.expiresIn,
      localId: signInResp.localId,
      email: signInResp.email
    });
  } catch (err) {
    console.error('login error', err?.response?.data || err.message);
    const msg = err?.response?.data?.error?.message || 'LOGIN_FAILED';
    return res.status(401).json({ error: msg });
  }
});

/**
 * Verify ID token server-side (use firebase-admin)
 * Accepts: { idToken }
 * Returns: decoded token or error
 */
router.post('/verifyToken', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return res.json({ ok: true, decoded });
  } catch (err) {
    console.error('verifyToken error', err.message);
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
});

module.exports = router;
