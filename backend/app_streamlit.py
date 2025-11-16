# app_streamlit.py
import streamlit as st
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io
import os

# -----------------------
# CONFIG — change these
# -----------------------
BACKEND_COMPARE_URL = os.environ.get('BACKEND_COMPARE_URL', 'http://localhost:3000/api/compare')
CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD', 'dcvmnm5ly')  # replace if needed
# -----------------------

st.set_page_config(page_title="VisuViewAI - Streamlit Compare", layout="wide", initial_sidebar_state="collapsed")

# --- Dark theme CSS to approximate your frontend look ---
st.markdown(
    """
    <style>
    /* background */
    .stApp {
      background: radial-gradient(60rem 60rem at 70% 0%, rgba(239,68,68,.02), transparent 60%),
                  radial-gradient(40rem 40rem at 0% 30%, rgba(239,68,68,.01), transparent 55%),
                  linear-gradient(to bottom, #0a0a0a, #000);
      color: #f8f8f8;
    }
    /* card like panels */
    .panel {
      background: rgba(8,8,8,0.65);
      border: 1px solid rgba(239,68,68,0.35);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7), inset 0 0 20px rgba(239,68,68,0.03);
    }
    .panel .title {
      color: #ff6b6b;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 8px;
    }
    
    /* small text */
    .muted { color: #cfcfcf; font-size: 13px; }
    /* center big controls */
    .big-btn {
      background: linear-gradient(#38a169, #2f855a);
      border-radius: 999px;
      padding: 10px 22px;
      color: white; font-weight:700;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      border: none;
    }
    .controls-row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    </style>
    """,
    unsafe_allow_html=True,
)

# --- Top controls UI (mimic your compare.html controls) ---
with st.container():
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    cols = st.columns([1, 2, 1])
    with cols[0]:
        st.markdown('<div class="title">Visual Difference Engine</div>', unsafe_allow_html=True)
        # small legend
        st.markdown('<div class="muted">Legend: <span style="color:#ef4444">● High</span> &nbsp; <span style="color:#f6c84f">● Med</span> &nbsp; <span style="color:#22c55e">● Low</span></div>', unsafe_allow_html=True)
    with cols[1]:
        # Controls
        mode = st.radio("Mode:", options=["Side-by-side", "Slider", "Blink"], index=0, horizontal=True)
        show_spot = st.checkbox("Show Spotting", value=True)
        shape = st.selectbox("shape:", ["Circle", "Box"])
        opacity_pct = st.slider("Heatmap opacity", min_value=0, max_value=100, value=40)
        thresh = st.number_input("Threshold", min_value=0, max_value=255, value=60)
    with cols[2]:
        st.write("")  # spacing
        # Create a big Start button
        # We'll wire this to send files to the backend below
        st.markdown('<div style="text-align:right; margin-top: 10px;">', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

st.write("")  # spacer

# --- Upload area (left column) ---
with st.container():
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.markdown('<div class="title">Upload & Compare</div>', unsafe_allow_html=True)
    up_cols = st.columns(2)
    before_file = up_cols[0].file_uploader("Upload before image", type=["png", "jpg", "jpeg"])
    after_file = up_cols[1].file_uploader("Upload after image", type=["png", "jpg", "jpeg"])
    st.markdown('</div>', unsafe_allow_html=True)

# --- Perform compare button ---
run_cols = st.columns([1, 1, 1, 1])
with run_cols[1]:
    start = st.button("START comparison", key="start", help="Send files to backend and show results")

# --- helper functions ---
def build_cloudinary_url(public_id_or_url, width=1024):
    """
    Accepts either a Cloudinary public_id (e.g. 'visuview/heatmaps/abc123')
    or a full URL (e.g. 'https://res.cloudinary.com/..../visuview/heatmaps/abc123.png').
    If a full URL is given we return it as-is. Otherwise construct an optimized URL.
    """
    if not public_id_or_url:
        return None

    # If it's already a URL, return it untouched
    lower = public_id_or_url.lower()
    if lower.startswith('http://') or lower.startswith('https://'):
        return public_id_or_url

    # Otherwise make a Cloudinary URL using public_id
    base = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload"
    params = f"f_auto,q_auto,w_{width}"
    # public_id might already include extension or folder; we assume public_id is safe to append
    url = f"{base}/{params}/{public_id_or_url}"
    return url

def pil_from_upload(filelike):
    try:
        filelike.seek(0)
    except Exception:
        pass
    return Image.open(io.BytesIO(filelike.read())).convert("RGBA")
def _is_normalized_value(v):
    # consider normalized if inside (0,1] and not near-int
    try:
        return isinstance(v, float) and 0 < v <= 1
    except:
        return False

def draw_regions_on_image(pil_img, regions, meta_shape=None, shape_mode="circle"):
    """
    Robust drawing:
      - supports pixel coords or normalized coords (0..1)
      - supports region as {x,y,w,h} or {bbox:[x,y,w,h]} or {bbox_xyxy:[x1,y1,x2,y2]}
      - meta_shape may be [H,W] or [W,H]; detection is attempted
      - **Outline-only** by default (no opaque filled blobs).
    """
    img = pil_img.copy().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")

    # font fallback
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", size=max(12, img.width // 40))
    except Exception:
        font = ImageFont.load_default()

    # detect meta dims ordering if provided
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
        if all(k in r for k in ('x','y','w','h')):
            return r['x'], r['y'], r['w'], r['h']
        if 'bbox' in r and isinstance(r['bbox'], (list,tuple)) and len(r['bbox']) == 4:
            bx = r['bbox'][0]; by = r['bbox'][1]; bw = r['bbox'][2]; bh = r['bbox'][3]
            return bx, by, bw, bh
        if 'bbox_xyxy' in r and isinstance(r['bbox_xyxy'], (list,tuple)) and len(r['bbox_xyxy']) == 4:
            x1,y1,x2,y2 = r['bbox_xyxy']
            return x1, y1, x2-x1, y2-y1
        if 'x1' in r and 'y1' in r and 'x2' in r and 'y2' in r:
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

        # Determine if values are normalized (0..1)
        normalized = False
        try:
            if any(isinstance(v, float) and 0 < v <= 1 for v in (rx, ry, rw, rh)):
                normalized = True
        except:
            normalized = False

        # Map to image pixels
        if normalized:
            x = int(rx * img.width)
            y = int(ry * img.height)
            w = int(rw * img.width)
            h = int(rh * img.height)
        elif metaW and metaH:
            scale_x = img.width / float(metaW) if metaW else 1.0
            scale_y = img.height / float(metaH) if metaH else 1.0
            x = int(rx * scale_x)
            y = int(ry * scale_y)
            w = int(rw * scale_x)
            h = int(rh * scale_y)
        else:
            x, y, w, h = int(rx), int(ry), int(rw), int(rh)

        # ensure bbox fits inside image
        x = max(0, min(x, img.width-1))
        y = max(0, min(y, img.height-1))
        w = max(1, min(w, img.width - x))
        h = max(1, min(h, img.height - y))

        # severity color
        sev = (r.get('sev') or r.get('severity') or '').lower() if isinstance(r, dict) else ''
        mean = r.get('mean', 0) if isinstance(r, dict) else 0

        if 'red' in sev:
            color = (239,68,68,220)   # outline color (opaque)
            fillc = (239,68,68,40)    # optional faint fill (low alpha)
        elif 'yellow' in sev:
            color = (234,179,8,220)
            fillc = (234,179,8,30)
        else:
            color = (34,197,94,220)
            fillc = (34,197,94,20)

        # pen width scaled to image size
        lw = max(2, img.width // 200)

        # clamp radius so a single region doesn't become a giant covering circle
        max_allowed_radius = int(min(img.width, img.height) * 0.45)  # never exceed ~45% of min dimension

        if shape_mode and isinstance(shape_mode, str) and shape_mode.lower().startswith('box'):
            # Outline rectangle only (no big filled rectangle)
            draw.rectangle([x, y, x + w, y + h], outline=color, width=lw)
            # if you want a faint fill, uncomment next line (uses very low alpha)
            # draw.rectangle([x, y, x + w, y + h], fill=fillc)
        else:
            # Circle/ellipse: base radius from region, but clamp to avoid huge filled discs
            cx = x + w // 2
            cy = y + h // 2
            radius = max(6, int(min(w, h) * 0.5))            # use half of min(w,h) so circle fits bbox
            radius = min(radius, max_allowed_radius)         # clamp

            # draw outline only
            draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], outline=color, width=lw)
            # optional faint fill: enable only if you want subtle fill
            # draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], outline=color, fill=fillc, width=lw)

        # label (small, top-left of bbox)
        try:
            label = f"#{i+1} {int(mean)}"
        except:
            label = f"#{i+1}"
        tx = x + 4
        ty = y + 4
        draw.text((tx, ty), label, fill=(255,255,255,220), font=font)

    return img


# --- If Start pressed: call backend and fetch results ---
if start:
    if not before_file or not after_file:
        st.warning("Please upload both before and after images.")
    else:
        with st.spinner("Uploading to backend and running compare..."):
            try:
                # build multipart request to your backend
                files = {
                    "beforeFile": (getattr(before_file, "name", "before.png"), before_file.getvalue(), "image/png"),
                    "afterFile": (getattr(after_file, "name", "after.png"), after_file.getvalue(), "image/png"),
                }
                # send
                resp = requests.post(BACKEND_COMPARE_URL, files=files, timeout=120)
                resp.raise_for_status()
                json_resp = resp.json()
            except Exception as e:
                st.error(f"Compare request failed: {e}")
                st.stop()

        if not (json_resp and json_resp.get("success")):
            st.error("Compare failed or backend returned an error.")
        else:
            st.success("Compare completed — rendering results")

            compare_json = json_resp.get("compareJson") or {}
            regions = compare_json.get("regions", []) or []
            meta = compare_json.get("meta", {}) or {}
            # meta.A_shape expected as [height, width] (but we'll detect several forms)
            meta_shape = meta.get("A_shape") or meta.get("Ashape") or meta.get("shape") or None

            # Prepare images to display
            before_file.seek(0)
            before_pil = Image.open(io.BytesIO(before_file.getvalue())).convert("RGBA")

            # If user asked to show spotting, draw markers. Otherwise show original before image.
            spotting_img = before_pil.copy()
            if show_spot and regions:
                # draw markers using our robust function
                try:
                    spotting_img = draw_regions_on_image(before_pil, regions, meta_shape, shape_mode=shape)
                except Exception as e:
                    st.error(f"Drawing spotting overlay failed: {e}")
                    # fallback — show original
                    spotting_img = before_pil.copy()

            # OPTIONAL TEST: draw a forced test marker so we can confirm drawing pipeline works.
            # Uncomment the lines below if you want to see a guaranteed marker for debug:
            # test_regions = [{'x': 0.15, 'y': 0.12, 'w': 0.18, 'h': 0.28, 'mean': 99, 'sev': 'red'}]
            # test_img = draw_regions_on_image(before_pil, test_regions, meta_shape=None, shape_mode='circle')
            # buf_test = io.BytesIO(); test_img.save(buf_test, format='PNG')
            # st.image(buf_test.getvalue(), caption="TEST overlay (red circle)", use_column_width=True)

            
            
            heatmap_pid = json_resp.get("heatmapPublicId") or json_resp.get("heatmap_public_id") or json_resp.get("heatmapUrl")
            
            
            # Heatmap view: if we have public id, get Cloudinary URL and fetch
            heatmap_img = None
            if heatmap_pid:
                # choose width to request ~ match the before image width
                req_w = min(1400, max(400, before_pil.width))
                cloud_url = build_cloudinary_url(heatmap_pid, width=req_w)
                try:
                    r = requests.get(cloud_url, timeout=30)
                    r.raise_for_status()
                    heatmap_img = Image.open(io.BytesIO(r.content)).convert("RGBA")
                    # resize heatmap to match the before image aspect / size for overlay convenience
                    heatmap_img = heatmap_img.resize(before_pil.size, Image.LANCZOS)
                except Exception as e:
                    st.warning(f"Could not fetch heatmap image from Cloudinary: {e}")
                    heatmap_img = None

            # Also draw regions on heatmap (so markers align)
            heatmap_with_spots = None
            if heatmap_img:
                heatmap_with_spots = heatmap_img

            # === Layout: show two side-by-side panels like your frontend ===
            left_col, right_col = st.columns(2, gap="large")

            with left_col:
                st.markdown('<div class="panel">', unsafe_allow_html=True)
                st.markdown('<div class="title">Spotting View</div>', unsafe_allow_html=True)
                # display the spotting image (before + markers)
                buf = io.BytesIO()
                spotting_img.save(buf, format="PNG")
                st.image(buf.getvalue(), use_container_width=True)
                st.markdown('</div>', unsafe_allow_html=True)

            with right_col:
                st.markdown('<div class="panel">', unsafe_allow_html=True)
                st.markdown('<div class="title">Heatmap View</div>', unsafe_allow_html=True)
                if heatmap_with_spots:
                    b = io.BytesIO()
                    heatmap_with_spots.save(b, format="PNG")
                    st.image(b.getvalue(), use_container_width=True)
                elif heatmap_img:
                    b = io.BytesIO()
                    heatmap_img.save(b, format="PNG")
                    st.image(b.getvalue(), use_container_width=True)
                else:
                    st.info("No heatmap available from server.")
                st.markdown('</div>', unsafe_allow_html=True)

            # --- Optional: show small table/insights below (like AI Insight panel) ---
            st.markdown('<div class="panel" style="margin-top:12px">', unsafe_allow_html=True)
            st.markdown('<div class="title">AI Insight</div>', unsafe_allow_html=True)
            # generate a simple summary
            cnt = len(regions)
            reds = sum(1 for r in regions if (r.get("sev") or "").lower() == "red")
            yellows = sum(1 for r in regions if (r.get("sev") or "").lower() == "yellow")
            greens = cnt - (reds + yellows)
            st.markdown(f"**{cnt} regions changed.** {reds} RED, {yellows} YELLOW, {greens} LOW.")
            # small JSON preview button
            with st.expander("Show raw compare JSON"):
                st.json(compare_json)
            st.markdown('</div>', unsafe_allow_html=True)
            
          # --- PROJECT SIDEBAR (collapsible) ---
import uuid

# initialize session state
if 'sidebar_open' not in st.session_state:
    st.session_state.sidebar_open = True
if 'projects' not in st.session_state:
    # list of dicts: {'id': <uuid>, 'name': 'project name'}
    st.session_state.projects = []
if 'selected_project' not in st.session_state:
    st.session_state.selected_project = None
if 'show_actions_index' not in st.session_state:
    st.session_state.show_actions_index = None
if 'rename_value' not in st.session_state:
    st.session_state.rename_value = ""

def create_project(name):
    if not name or not name.strip():
        return False
    pname = name.strip()
    st.session_state.projects.insert(0, {'id': uuid.uuid4().hex, 'name': pname})
    st.session_state.project_name_input = ""  # clear input
    return True

def delete_project_at(idx):
    try:
        del st.session_state.projects[idx]
    except Exception:
        pass
    st.session_state.show_actions_index = None

def start_rename_at(idx):
    st.session_state.show_actions_index = idx
    st.session_state.rename_value = st.session_state.projects[idx]['name']

def apply_rename_at(idx):
    newv = (st.session_state.rename_value or "").strip()
    if newv:
        st.session_state.projects[idx]['name'] = newv
    st.session_state.show_actions_index = None

# Render sidebar collapsed vs open
if st.session_state.sidebar_open:
    with st.sidebar:
        st.markdown('<div class="panel">', unsafe_allow_html=True)
        # header row: title + collapse toggle
        hcol1, hcol2 = st.columns([8,1], gap="small")
        with hcol1:
            st.markdown('<div class="title">Create Project</div>', unsafe_allow_html=True)

        # project name input + create button
        st.markdown('<div style="margin-top:6px"></div>', unsafe_allow_html=True)
        # use a stable input key
        pname = st.text_input("Name Your Project:", key="project_name_input", placeholder="Enter project name")
        col_input, col_btn, col_msg = st.columns([4, 2, 4])  # adjust widths as needed
        with col_input:
            st.write("") # spacing
        with col_btn:
            if st.button("Create project", key="create_project_btn"):
                ok = create_project(pname)
                if not ok:
                    col_msg.warning("Please enter a valid project name.")
                else:
                    col_msg.success("Project created.", icon="✅")

        st.markdown('<div style="height:12px"></div>', unsafe_allow_html=True)
        # Project History heading
        st.markdown('<div class="title" style="font-size:16px; margin-bottom:6px">Project History</div>', unsafe_allow_html=True)

        # list projects
        if not st.session_state.projects:
            st.markdown('<div style="padding:10px; border-radius:8px; border:1px solid rgba(239,68,68,0.18);">None</div>', unsafe_allow_html=True)
        else:
            # for each project show a row: name and 3-dot more button
            for idx, p in enumerate(st.session_state.projects):
                row_col = st.columns([8,1], gap="small")
                with row_col[0]:
                    # clicking the project selects it (we store selected_project)
                    if st.button(p['name'], key=f"proj_btn_{p['id']}"):
                        st.session_state.selected_project = p['id']
                with row_col[1]:
                    # three-dot button to reveal actions
                    if st.button("⋮", key=f"proj_more_{p['id']}"):
                        # toggle action menu for this index
                        if st.session_state.show_actions_index == idx:
                            st.session_state.show_actions_index = None
                        else:
                            st.session_state.show_actions_index = idx

                # if actions menu visible for this project, show rename/delete inline
                if st.session_state.show_actions_index == idx:
                    act_cols = st.columns([6,2,2], gap="small")
                    with act_cols[0]:
                        st.text_input("Rename to:", value=p['name'], key=f"rename_input_{p['id']}", on_change=lambda i=idx: st.session_state.update({'show_actions_index': i, 'rename_value': st.session_state.get(f'rename_input_{p["id"]}', p['name'])}) )
                    with act_cols[1]:
                        if st.button("Save", key=f"save_rename_{p['id']}"):
                            # pull rename text, fallback to stored rename_value
                            newv = st.session_state.get(f"rename_input_{p['id']}", st.session_state.rename_value)
                            newv = (newv or "").strip()
                            if newv:
                                st.session_state.projects[idx]['name'] = newv
                                st.session_state.show_actions_index = None
                                st.success("Renamed", icon="✅")
                            else:
                                st.warning("Name cannot be empty.")
                    with act_cols[2]:
                        if st.button("Delete", key=f"delete_proj_{p['id']}"):
                            delete_project_at(idx)
                            st.success("Deleted", icon="🗑️")

        st.markdown('</div>', unsafe_allow_html=True)

else:
    # collapsed sidebar: render a floating 'open' button at top-left of main area
    open_col = st.columns([1, 11])
    with open_col[0]:
        if st.button("☰", key="open_sidebar_btn", help="Open sidebar"):
            st.session_state.sidebar_open = True
    with open_col[1]:
        st.write("")  # keep layout consistent
