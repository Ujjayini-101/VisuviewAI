# app_streamlit_timeseries.py
import streamlit as st
import requests
from PIL import Image, ImageDraw, ImageFont
import io
import os
import uuid
from datetime import datetime

# NEW imports for homography
import numpy as np
try:
    import cv2
    HAS_CV2 = True
except Exception:
    cv2 = None
    HAS_CV2 = False

# -----------------------
# CONFIG — change these
# -----------------------
BACKEND_COMPARE_URL = os.environ.get('BACKEND_COMPARE_URL', 'http://localhost:3000/api/compare')
CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD', 'dcvmnm5ly')  # replace if needed
# -----------------------

st.set_page_config(page_title="VisuViewAI - Timeseries Portal", layout="wide", initial_sidebar_state="collapsed")

# --- Dark theme CSS (kept small) ---
st.markdown(
    """
    <style>
    .stApp {
      background: radial-gradient(60rem 60rem at 70% 0%, rgba(239,68,68,.02), transparent 60%),
                  radial-gradient(40rem 40rem at 0% 30%, rgba(239,68,68,.01), transparent 55%),
                  linear-gradient(to bottom, #0a0a0a, #000);
      color: #f8f8f8;
    }
    .panel {
      background: rgba(8,8,8,0.65);
      border: 1px solid rgba(239,68,68,0.35);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7), inset 0 0 20px rgba(239,68,68,0.03);
    }
    .panel .title { color: #ff6b6b; font-weight:700; font-size:24px; margin-bottom:8px; }
    .muted { color: #cfcfcf; font-size: 13px; }
    /* global base font for most UI text */
.stApp {
  font-size: 16px !important;          /* increase base font (try 16px, 18px, etc.) */
  line-height: 1.35 !important;
}

/* panel title (big red titles) */
.panel .title {
  color: #ff6b6b;
  font-weight: 700;
  font-size: 22px !important;          /* increase title size (was 18px) */
  margin-bottom: 8px;
}

/* small muted text under titles */
.muted {
  color: #cfcfcf;
  font-size: 15px !important;          /* was 13px — raise to 15 or 16 */
}

/* info/expander text */
[data-testid="stExpander"] .streamlit-expanderHeader,
.stExpanderHeader {
  font-size: 15px !important;
}

/* buttons: increase button text size */
.stButton>button, .stButton>button>div {
  font-size: 15px !important;
  font-weight: 600 !important;
}

/* captions under images (Streamlit often uses .stImage) */
.stImage figcaption {
  font-size: 14px !important;
}

    </style>
    """,
    unsafe_allow_html=True,
)

# --------------------
# Helper functions (mostly ported from your original)
# --------------------
def build_cloudinary_url(public_id_or_url, width=1024):
    if not public_id_or_url:
        return None
    lower = public_id_or_url.lower()
    if lower.startswith('http://') or lower.startswith('https://'):
        return public_id_or_url
    base = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload"
    params = f"f_auto,q_auto,w_{width}"
    url = f"{base}/{params}/{public_id_or_url}"
    return url

def pil_from_uploadedfile(uploaded_file):
    try:
        uploaded_file.seek(0)
    except Exception:
        pass
    return Image.open(io.BytesIO(uploaded_file.getvalue())).convert("RGBA")

def extract_exif_datetime(pil_img):
    try:
        info = pil_img._getexif()
        if not info:
            return None
        # 36867 is DateTimeOriginal
        dt = info.get(36867) or info.get(306)
        if dt:
            # format "YYYY:MM:DD HH:MM:SS"
            try:
                return datetime.strptime(dt, "%Y:%m:%d %H:%M:%S")
            except Exception:
                return None
    except Exception:
        return None

def draw_regions_on_image(pil_img, regions, meta_shape=None, shape_mode="circle"):
    # Copy/paste of your original robust drawing helper (kept behaviour)
    img = pil_img.copy().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", size=max(12, img.width // 40))
    except Exception:
        font = ImageFont.load_default()
    metaW = metaH = None
    if meta_shape and isinstance(meta_shape, (list, tuple)) and len(meta_shape) >= 2:
        a, b = meta_shape[0], meta_shape[1]
        if a > b:
            if (a / b) > (img.width / max(1, img.height)):
                metaW, metaH = a, b
            else:
                metaH, metaW = a, b
        else:
            if (b / (a or 1)) > (img.width / max(1, img.height)):
                metaW, metaH = b, a
            else:
                metaH, metaW = a, b
    if metaW is None and meta_shape and len(meta_shape) >= 2:
        metaH, metaW = meta_shape[0], meta_shape[1]

    def extract_xywh(r):
        if isinstance(r, dict) and all(k in r for k in ('x','y','w','h')):
            return r['x'], r['y'], r['w'], r['h']
        if isinstance(r, dict) and 'bbox' in r and isinstance(r['bbox'], (list,tuple)) and len(r['bbox']) == 4:
            bx,by,bw,bh = r['bbox']
            return bx,by,bw,bh
        if isinstance(r, dict) and 'bbox_xyxy' in r and isinstance(r['bbox_xyxy'], (list,tuple)) and len(r['bbox_xyxy']) == 4:
            x1,y1,x2,y2 = r['bbox_xyxy']
            return x1,y1,(x2-x1),(y2-y1)
        if isinstance(r, dict) and 'x1' in r and 'y1' in r and 'x2' in r and 'y2' in r:
            return r['x1'], r['y1'], (r['x2']-r['x1']), (r['y2']-r['y1'])
        try:
            if isinstance(r, (list, tuple)) and len(r) >= 4:
                return r[0], r[1], r[2], r[3]
        except:
            pass
        return None

    for i, r in enumerate(regions or []):
        bbox = extract_xywh(r)
        if not bbox:
            continue
        rx, ry, rw, rh = bbox
        normalized = False
        try:
            if any(isinstance(v, float) and 0 < v <= 1 for v in (rx, ry, rw, rh)):
                normalized = True
        except:
            normalized = False

        if normalized:
            x = int(rx * img.width); y = int(ry * img.height)
            w = int(rw * img.width); h = int(rh * img.height)
        elif metaW and metaH:
            scale_x = img.width / float(metaW) if metaW else 1.0
            scale_y = img.height / float(metaH) if metaH else 1.0
            x = int(rx * scale_x); y = int(ry * scale_y)
            w = int(rw * scale_x); h = int(rh * scale_y)
        else:
            x, y, w, h = int(rx), int(ry), int(rw), int(rh)

        x = max(0, min(x, img.width-1))
        y = max(0, min(y, img.height-1))
        w = max(1, min(w, img.width - x))
        h = max(1, min(h, img.height - y))

        sev = (r.get('sev') or r.get('severity') or '').lower() if isinstance(r, dict) else ''
        mean = r.get('mean', 0) if isinstance(r, dict) else 0

        if 'red' in sev:
            color = (239,68,68,220); fillc = (239,68,68,40)
        elif 'yellow' in sev:
            color = (234,179,8,220); fillc = (234,179,8,30)
        else:
            color = (34,197,94,220); fillc = (34,197,94,20)

        lw = max(2, img.width // 200)
        max_allowed_radius = int(min(img.width, img.height) * 0.45)

        if shape_mode and isinstance(shape_mode, str) and shape_mode.lower().startswith('box'):
            draw.rectangle([x, y, x + w, y + h], outline=color, width=lw)
        else:
            cx = x + w // 2; cy = y + h // 2
            radius = max(6, int(min(w, h) * 0.5))
            radius = min(radius, max_allowed_radius)
            draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], outline=color, width=lw)

        try:
            label = f"#{i+1} {int(mean)}"
        except:
            label = f"#{i+1}"
        tx = x + 4; ty = y + 4
        draw.text((tx, ty), label, fill=(255,255,255,220), font=font)

    return img

# NEW: Homography alignment helper using ORB + RANSAC
def align_image_homography_bytes(before_bytes: bytes, after_bytes: bytes, min_matches=12, ratio_test=0.75):
    """
    Attempt to compute homography from 'after' to 'before' and warp 'after' to align with 'before'.
    Returns (aligned_after_bytes, homography_dict) where homography_dict is None if not applied
    or {'applied': True, 'matrix': flattened_list_of_9} if applied.
    On failure returns original after_bytes and homography_dict=None.
    """
    if not HAS_CV2:
        return after_bytes, None

    try:
        # decode images to cv2 (BGR)
        arr_before = np.frombuffer(before_bytes, dtype=np.uint8)
        img_before = cv2.imdecode(arr_before, cv2.IMREAD_COLOR)
        arr_after = np.frombuffer(after_bytes, dtype=np.uint8)
        img_after = cv2.imdecode(arr_after, cv2.IMREAD_COLOR)

        if img_before is None or img_after is None:
            return after_bytes, None

        # convert to gray
        g1 = cv2.cvtColor(img_before, cv2.COLOR_BGR2GRAY)
        g2 = cv2.cvtColor(img_after, cv2.COLOR_BGR2GRAY)

        # ORB detector
        orb = cv2.ORB_create(5000)
        kp1, des1 = orb.detectAndCompute(g1, None)
        kp2, des2 = orb.detectAndCompute(g2, None)

        if des1 is None or des2 is None or len(kp1) < 8 or len(kp2) < 8:
            return after_bytes, None

        # BFMatcher with Hamming (ORB)
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        matches = bf.knnMatch(des1, des2, k=2)

        # apply ratio test
        good = []
        for m_n in matches:
            if len(m_n) < 2:
                continue
            m, n = m_n
            if m.distance < ratio_test * n.distance:
                good.append(m)

        if len(good) < min_matches:
            # not enough good matches
            return after_bytes, None

        # build src/dst points
        src_pts = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

        # find homography: map points in after (dst_pts) to before (src_pts)
        H, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
        if H is None:
            return after_bytes, None

        # warp 'after' into the before image coordinate frame (use before size)
        h_before, w_before = img_before.shape[:2]
        warped = cv2.warpPerspective(img_after, H, (w_before, h_before), flags=cv2.INTER_LINEAR)

        # encode back to PNG bytes
        success, enc = cv2.imencode('.png', warped)
        if not success:
            return after_bytes, None
        aligned_bytes = enc.tobytes()
        homography_info = {'applied': True, 'matrix': H.flatten().tolist()}
        return aligned_bytes, homography_info

    except Exception:
        return after_bytes, None

# Compare pair by sending to backend
def compare_pair_bytes(b_before: bytes, b_after: bytes, before_name="before.png", after_name="after.png", timeout=90):
    files = {
        "beforeFile": (before_name, b_before, "image/png"),
        "afterFile": (after_name, b_after, "image/png"),
    }
    try:
        resp = requests.post(BACKEND_COMPARE_URL, files=files, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

# --------------------
# Session-state initialization
# --------------------
if 'timeline_results' not in st.session_state:
    st.session_state.timeline_results = []  # list of dicts per pair: {'pair_idx': i, 'a_name':..., 'b_name':..., 'json':..., 'heatmap_img_bytes':..., 'homography': ...}
if 'timeline_idx' not in st.session_state:
    st.session_state.timeline_idx = 0
if 'uploaded_files_meta' not in st.session_state:
    st.session_state.uploaded_files_meta = []  # store metadata: [{'name':..., 'bytes':..., 'pil':..., 'exif_dt':...}, ...]

# If cv2 missing, show small warning
if not HAS_CV2:
    st.warning("OpenCV (cv2) not available — homography alignment disabled. Install 'opencv-python-headless' and 'numpy' to enable homography.")

# --------------------
# Page header / controls
# --------------------
st.markdown('<div class="panel">', unsafe_allow_html=True)
cols = st.columns([2,6,2])
with cols[0]:
    st.markdown('<div class="title front-size:24px">VisuViewAI — Timeseries Portal</div>', unsafe_allow_html=True)
with cols[1]:
    st.markdown('<div class="muted front-size:14px">Upload a timeline of images (same object across time). We will compare adjacent frames (A→B, B→C, ...)</div>', unsafe_allow_html=True)
with cols[2]:
    # simple controls
    st.markdown('<div style="text-align:right"></div>', unsafe_allow_html=True)
st.markdown('</div>', unsafe_allow_html=True)
st.write("")

# --- Upload area ---
st.markdown('<div class="panel">', unsafe_allow_html=True)
st.markdown('<div class="title">Timeline Input</div>', unsafe_allow_html=True)
col_u1, col_u2 = st.columns([6,4])
with col_u1:
    uploaded = st.file_uploader("Upload timeline images (multiple)", type=["png","jpg","jpeg"], accept_multiple_files=True, help="Upload frames in the desired chronological order, or choose sort options below.")
with col_u2:
    sort_mode = st.selectbox("Sort by", options=["Upload order", "Filename (alphanumeric)", "Exif Date (if available)"], index=0)
    shape = st.selectbox("Spot shape", ["Circle","Box"], index=0)
    show_spot = st.checkbox("Show Spotting", value=True)
    opacity_pct = st.slider("Heatmap opacity", min_value=0, max_value=100, value=40)
    thresh = st.number_input("Threshold", min_value=0, max_value=255, value=60)

st.markdown('</div>', unsafe_allow_html=True)
st.write("")

# Buttons: Run Timeline / Clear
run_cols = st.columns([1,1,1,1,6])
with run_cols[0]:
    run_timeline = st.button("Run Timeline", help="Compare each adjacent pair and store results in session (may take time for many images).")
with run_cols[1]:
    step_by_step = st.button("Compare on Demand", help="Do not run all pairs automatically; use Next to compare pairs on demand.")
with run_cols[2]:
    if st.button("Clear Results"):
        st.session_state.timeline_results = []
        st.session_state.timeline_idx = 0
        st.session_state.uploaded_files_meta = []
        st.success("Cleared timeline results.")
with run_cols[3]:
    st.write("")  # spacing

# If files uploaded, prepare metadata and optionally sort
if uploaded:
    # build list of meta entries
    meta_list = []
    for f in uploaded:
        try:
            b = f.getvalue()
            pil = Image.open(io.BytesIO(b)).convert("RGBA")
        except Exception:
            # fallback reading
            b = f.read()
            pil = Image.open(io.BytesIO(b)).convert("RGBA")
        exif_dt = extract_exif_datetime(pil)
        meta_list.append({'name': getattr(f, "name", f"img_{uuid.uuid4().hex}.png"), 'bytes': b, 'pil': pil, 'exif_dt': exif_dt})
    # sort if requested
    if sort_mode == "Filename (alphanumeric)":
        meta_list = sorted(meta_list, key=lambda x: x['name'])
    elif sort_mode == "Exif Date (if available)":
        # those without exif datetime go to end, preserve upload order otherwise
        meta_list = sorted(meta_list, key=lambda x: (x['exif_dt'] is None, x['exif_dt'] or datetime.max))
    # store in session
    st.session_state.uploaded_files_meta = meta_list

# Helper: ensure we have at least 2 frames to compare
n_frames = len(st.session_state.uploaded_files_meta or [])
st.markdown(f"**Frames uploaded:** {n_frames}")
if n_frames < 2:
    st.info("Upload at least 2 images to run timeline comparisons.")
    # allow user to still view uploaded thumbnails
    if n_frames > 0:
        cols = st.columns(min(6, n_frames))
        for i, m in enumerate(st.session_state.uploaded_files_meta):
            with cols[i]:
                st.image(m['bytes'], caption=m['name'], use_container_width=True)
    st.stop()

# Determine total pairs
total_pairs = max(0, n_frames - 1)
st.markdown(f"**Total comparisons (adjacent pairs):** {total_pairs}")

# Function to ensure results list length
def ensure_results_length():
    if len(st.session_state.timeline_results) < total_pairs:
        # initialize empty placeholders
        for i in range(len(st.session_state.timeline_results), total_pairs):
            a = st.session_state.uploaded_files_meta[i]['name']
            b = st.session_state.uploaded_files_meta[i+1]['name']
            st.session_state.timeline_results.append({'pair_idx': i, 'a_name': a, 'b_name': b, 'json': None, 'heatmap_img_bytes': None, 'homography': None})

ensure_results_length()

# Run timeline automatically: iterate all pairs and call backend
if run_timeline:
    with st.spinner("Running timeline comparisons... this may take time depending on number of frames."):
        for i in range(total_pairs):
            # skip if already have a successful result (to avoid re-upload)
            existing = st.session_state.timeline_results[i]
            if existing.get('json') and existing['json'].get('success'):
                continue
            a_meta = st.session_state.uploaded_files_meta[i]
            b_meta = st.session_state.uploaded_files_meta[i+1]

            # --- NEW: try homography alignment here (align after to before) ---
            aligned_after_bytes = b_meta['bytes']
            homography_info = None
            if HAS_CV2:
                aligned_after_bytes, homography_info = align_image_homography_bytes(a_meta['bytes'], b_meta['bytes'])
            st.session_state.timeline_results[i]['homography'] = homography_info

            # send compare (use aligned image bytes if alignment succeeded)
            res = compare_pair_bytes(a_meta['bytes'], aligned_after_bytes, before_name=a_meta['name'], after_name=b_meta['name'], timeout=120)
            st.session_state.timeline_results[i]['json'] = res

            # if heatmap id present try fetching image bytes now and store
            pid = None
            if res and res.get('success'):
                pid = res.get('heatmapPublicId') or res.get('heatmap_public_id') or res.get('heatmapUrl')
            if pid:
                try:
                    req_w = min(1400, max(400, a_meta['pil'].width))
                    cloud_url = build_cloudinary_url(pid, width=req_w)
                    r = requests.get(cloud_url, timeout=30); r.raise_for_status()
                    st.session_state.timeline_results[i]['heatmap_img_bytes'] = r.content
                except Exception:
                    st.session_state.timeline_results[i]['heatmap_img_bytes'] = None
        st.success("Timeline comparisons finished.")
        st.session_state.timeline_idx = 0  # show first pair

# Step-by-step mode: user presses Next to compute next pair on demand
nav_col_left, nav_col_mid, nav_col_right = st.columns([2,6,2])
with nav_col_left:
    if st.button("Previous"):
        if st.session_state.timeline_idx > 0:
            st.session_state.timeline_idx -= 1
with nav_col_right:
    if st.button("Next"):
        if st.session_state.timeline_idx < total_pairs - 1:
            st.session_state.timeline_idx += 1
        else:
            st.info("Reached last pair.")
# Also allow explicit compare for current pair if missing
curr_idx = st.session_state.timeline_idx
current_result = st.session_state.timeline_results[curr_idx]

if (not current_result.get('json')) and step_by_step:
    # run compare for current pair only
    a_meta = st.session_state.uploaded_files_meta[curr_idx]
    b_meta = st.session_state.uploaded_files_meta[curr_idx+1]

    # --- NEW: try homography for this single pair ---
    aligned_after_bytes = b_meta['bytes']
    homography_info = None
    if HAS_CV2:
        aligned_after_bytes, homography_info = align_image_homography_bytes(a_meta['bytes'], b_meta['bytes'])
    st.session_state.timeline_results[curr_idx]['homography'] = homography_info

    with st.spinner(f"Comparing pair {curr_idx+1}/{total_pairs}"):
        res = compare_pair_bytes(a_meta['bytes'], aligned_after_bytes, before_name=a_meta['name'], after_name=b_meta['name'], timeout=90)
        st.session_state.timeline_results[curr_idx]['json'] = res
        if res and res.get('success'):
            pid = res.get('heatmapPublicId') or res.get('heatmap_public_id') or res.get('heatmapUrl')
            if pid:
                try:
                    req_w = min(1400, max(400, a_meta['pil'].width))
                    cloud_url = build_cloudinary_url(pid, width=req_w)
                    r = requests.get(cloud_url, timeout=30); r.raise_for_status()
                    st.session_state.timeline_results[curr_idx]['heatmap_img_bytes'] = r.content
                except Exception:
                    st.session_state.timeline_results[curr_idx]['heatmap_img_bytes'] = None

# === Display current pair results ===
st.markdown('<div class="panel" style="margin-top:12px">', unsafe_allow_html=True)
st.markdown(f'<div class="title">Pair {curr_idx+1} / {total_pairs} — {st.session_state.timeline_results[curr_idx]["a_name"]}  →  {st.session_state.timeline_results[curr_idx]["b_name"]}</div>', unsafe_allow_html=True)

res = st.session_state.timeline_results[curr_idx].get('json')
a_meta = st.session_state.uploaded_files_meta[curr_idx]
b_meta = st.session_state.uploaded_files_meta[curr_idx+1]

left_col, right_col = st.columns(2, gap="large")
with left_col:
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.markdown('<div class="title">Spotting View</div>', unsafe_allow_html=True)
    # Show spotting overlay (before image + markers)
    before_pil = a_meta['pil']
    spotting_img = before_pil.copy()
    if res and res.get('success'):
        compare_json = res.get('compareJson') or {}
        regions = compare_json.get('regions', []) or []
        meta_shape = compare_json.get('meta', {}).get('A_shape') or compare_json.get('meta', {}).get('Ashape') or compare_json.get('meta', {}).get('shape') or None
        if show_spot and regions:
            try:
                spotting_img = draw_regions_on_image(before_pil, regions, meta_shape, shape_mode=shape)
            except Exception as e:
                st.error(f"Drawing overlay failed: {e}")
                spotting_img = before_pil.copy()
    buf = io.BytesIO(); spotting_img.save(buf, format="PNG")
    st.image(buf.getvalue(), use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

with right_col:
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.markdown('<div class="title">Heatmap View</div>', unsafe_allow_html=True)
    heat_bytes = st.session_state.timeline_results[curr_idx].get('heatmap_img_bytes')
    if heat_bytes:
        try:
            heat_pil = Image.open(io.BytesIO(heat_bytes)).convert("RGBA")
            # optionally resize to match before image for overlay convenience
            heat_pil = heat_pil.resize(before_pil.size, Image.LANCZOS)
            # apply chosen opacity by compositing over a transparent background
            if opacity_pct < 100:
                alpha = int(255 * (opacity_pct / 100.0))
                # reduce heatmap alpha uniformly
                arr = heat_pil.split()
                new_alpha = arr[3].point(lambda p: int(p * (alpha / 255.0)))
                heat_pil.putalpha(new_alpha)
            buf2 = io.BytesIO(); heat_pil.save(buf2, format="PNG")
            st.image(buf2.getvalue(), use_container_width=True)
        except Exception as e:
            st.warning(f"Could not render heatmap image: {e}")
            st.info("Heatmap not available.")
    elif res and res.get('success'):
        # maybe server returned id but we didn't fetch; try on-demand fetch
        pid = res.get('heatmapPublicId') or res.get('heatmap_public_id') or res.get('heatmapUrl')
        if pid:
            try:
                req_w = min(1400, max(400, before_pil.width))
                cloud_url = build_cloudinary_url(pid, width=req_w)
                r = requests.get(cloud_url, timeout=30); r.raise_for_status()
                heat_pil = Image.open(io.BytesIO(r.content)).convert("RGBA")
                heat_pil = heat_pil.resize(before_pil.size, Image.LANCZOS)
                if opacity_pct < 100:
                    alpha = int(255 * (opacity_pct / 100.0))
                    arr = heat_pil.split()
                    new_alpha = arr[3].point(lambda p: int(p * (alpha / 255.0)))
                    heat_pil.putalpha(new_alpha)
                buf2 = io.BytesIO(); heat_pil.save(buf2, format="PNG")
                st.image(buf2.getvalue(), use_container_width=True)
                # cache it
                st.session_state.timeline_results[curr_idx]['heatmap_img_bytes'] = r.content
            except Exception as e:
                st.warning(f"Could not fetch heatmap: {e}")
                st.info("Heatmap not available.")
        else:
            st.info("No heatmap available from server for this pair.")
    else:
        st.info("No compare result available yet for this pair. Use 'Compare on Demand' or 'Run Timeline' to compute it.")
    st.markdown('</div>', unsafe_allow_html=True)

st.markdown('</div>', unsafe_allow_html=True)

# --- AI Insight panel below (counts etc) ---
st.markdown('<div class="panel" style="margin-top:12px">', unsafe_allow_html=True)
st.markdown('<div class="title">AI Insight</div>', unsafe_allow_html=True)
if res and res.get('success'):
    compare_json = res.get('compareJson') or {}
    regions = compare_json.get('regions', []) or []
    cnt = len(regions)
    reds = sum(1 for r in regions if (r.get("sev") or "").lower() == "red")
    yellows = sum(1 for r in regions if (r.get("sev") or "").lower() == "yellow")
    greens = cnt - (reds + yellows)
    st.markdown(f"**{cnt} regions changed.** {reds} RED, {yellows} YELLOW, {greens} LOW.")
    with st.expander("Show raw compare JSON"):
        st.json(compare_json)
else:
    st.write("No comparison JSON to show for this pair yet.")
st.markdown('</div>', unsafe_allow_html=True)

# Footer: show simple navigation of thumbnails and allow jumping to a pair by clicking
st.write("")
st.markdown('<div class="panel">', unsafe_allow_html=True)
st.markdown('<div class="title">Frame Thumbnails / Jump</div>', unsafe_allow_html=True)
thumb_cols = st.columns(min(6, n_frames))
for i, m in enumerate(st.session_state.uploaded_files_meta):
    # create small button per frame — if clicked, jump to that pair (max(0, i-1))
    caption = m['name']
    with thumb_cols[i % len(thumb_cols)]:
        st.image(m['bytes'], caption=caption, use_container_width=True)
        if st.button(f"Jump → pair {max(0, i-1)+1}", key=f"jump_{i}"):
            # jump to pair that involves this frame as 'after' (so pair = i-1) except i==0 -> pair 0
            new_pair = max(0, min(total_pairs-1, i-1))
            st.session_state.timeline_idx = new_pair
st.markdown('</div>', unsafe_allow_html=True)

# small note
st.write("")
st.info("Notes: upload order is used unless you choose Filename/Exif sorting. Comparisons are adjacent frames only. Homography alignment is attempted automatically if OpenCV is installed. Backend must accept two files at BACKEND_COMPARE_URL and return JSON with keys like 'success','compareJson','heatmapPublicId' (or 'heatmap_public_id'/'heatmapUrl').")
