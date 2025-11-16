const admin = require('firebase-admin');

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);

    if (!match) {
      return res.status(401).json({ error: 'NO_TOKEN' });
    }

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    
    req.user = decoded;
    next();
    
  } catch (err) {
    console.error('auth verify failed', err.message);
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
};
