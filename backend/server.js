// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

try {
  const authRouter = require('./routes/auth');
  if (authRouter) app.use('/api/auth', authRouter);
} catch (e) {
  // ignore if not present
}

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({ dest: tmpDir });

app.post('/api/compare', upload.fields([
  { name: 'beforeFile', maxCount: 1 },
  { name: 'afterFile', maxCount: 1 }
]), async (req, res) => {
  try {
    // validate inputs
    if (!req.files || !req.files.beforeFile || !req.files.afterFile) {
      return res.status(400).json({ success: false, error: 'Please send both beforeFile and afterFile' });
    }

    const beforePath = req.files.beforeFile[0].path;
    const afterPath = req.files.afterFile[0].path;

    // run python comparator
    const pythonExec = process.env.PYTHON_PATH || 'python3';
    const py = spawn(pythonExec, [path.join(__dirname, 'compare.py'), beforePath, afterPath], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    py.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    py.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const exitCode = await new Promise((resolve) => {
      py.on('close', (code) => resolve(code));
    });

    if (exitCode !== 0) {
      console.error('compare.py stderr:', stderr);
      // cleanup
      try { fs.unlinkSync(beforePath); fs.unlinkSync(afterPath); } catch (e) {}
      return res.status(500).json({ success: false, error: 'Comparison failed', detail: stderr || 'compare.py exited non-zero' });
    }

    // parse python stdout (compare.py prints a wrapper JSON)
    let parsedPy = null;
    try {
      parsedPy = JSON.parse(stdout);
    } catch (e) {
      console.error('Failed to parse compare.py output as JSON', e);
      try { fs.unlinkSync(beforePath); fs.unlinkSync(afterPath); } catch (err) {}
      return res.status(500).json({
        success: false,
        error: 'Invalid compare output (not JSON)',
        parseError: String(e),
        raw_stdout: stdout.slice(0, 20000),
        raw_stderr: stderr.slice(0, 20000)
      });
    }

    // parsedPy is expected to be a wrapper:
    // { success: true, compareJson: {...}, heatmap_file: "...", heatmap_png_base64: "...", score: ... }

    // Extract the actual compareJson (regions, meta)
    const compResult = (parsedPy && parsedPy.compareJson) ? parsedPy.compareJson : parsedPy;

    // Extract heatmap info from wrapper
    const heatmapFileLocal = parsedPy.heatmap_file || parsedPy.heatmapFile || null;
    const heatmapBase64 = parsedPy.heatmap_png_base64 || parsedPy.heatmapBase64 || null;

    // Upload heatmap file to Cloudinary if present and configured
    let uploadRes = null;
    if (heatmapFileLocal && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true
        });

        uploadRes = await cloudinary.uploader.upload(heatmapFileLocal, { folder: 'visuview/heatmaps' });
      } catch (err) {
        console.warn('Cloudinary upload failed:', err && err.message ? err.message : err);
        uploadRes = null;
      }
    }

    // cleanup the two input files (we keep heatmap file for Cloudinary upload)
    try { fs.unlinkSync(beforePath); fs.unlinkSync(afterPath); } catch (e) {}

    // Build a safe compareJson to return (avoid large fields)
    const safeCompareJson = {
      regions: Array.isArray(compResult && compResult.regions) ? compResult.regions : (compResult && compResult.regions) || [],
      meta: (compResult && compResult.meta) ? compResult.meta : {},
      summary: compResult && compResult.summary ? compResult.summary : null,
      ssim_score: (compResult && typeof compResult.ssim_score !== 'undefined') ? compResult.ssim_score : (parsedPy && typeof parsedPy.score !== 'undefined' ? parsedPy.score : null)
    };

    // Determine heatmap identifiers/urls to return
    const heatmapPublicId = uploadRes && uploadRes.public_id ? uploadRes.public_id : (parsedPy.heatmapPublicId || parsedPy.heatmap_public_id || null);
    const heatmapUrl = uploadRes && uploadRes.secure_url ? uploadRes.secure_url : (parsedPy.heatmapUrl || parsedPy.heatmap_url || null);

    // Final response (no large base64)
    return res.json({
      success: true,
      compareJson: safeCompareJson,
      heatmapPublicId,
      heatmapUrl
    });

  } catch (err) {
    console.error('compare endpoint unexpected error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});


// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
