# VisuViewAI — Visual Difference Engine (Dual-Portal AI Platform)  
### ⚡️ *Your AI Engine for Visual Understanding*

VisuViewAI is a dual-portal image comparison platform built to solve two real-world needs:

1. General Users  
   Clear, confusion-free visual explanations of differences between two photos taken at different times.

2. Professional Users (Motorsports, Manufacturing, QA)  
   AI-assisted detection of cracks, dents, panel deformation, logo inconsistencies, and structural anomalies using advanced computer vision.

VisuViewAI combines OpenCV, Python, Node.js backend APIs, Streamlit dashboards, Heatmap visualizations, Firebase Authentication, Firestore DB, Cloudinary, and AI-powered insights (Gemini).

---

##  Key Features

### 🟢 Portal 1 — General Users (Upload & Compare)
- Simple and intuitive upload → instant diff visualization  
- Dynamic heatmaps showing changed areas  
- Clear, friendly AI explanations such as:
  - “Lighting changed near the window”
  - “Object shifted 11px left”
  - “New item detected on the table”
- Human-friendly AI Insight table  
- Designed to remove visual confusion for daily users  

---

### 🔴 Portal 2 — Professional Time-Series Portal (Motorsports & QA)  
- Crack & dent detection  
- ΔE color distance measurement  
- Highlight structural and geometric shifts  
- Severity scoring (RED / YELLOW / GREEN)  
- Image slider, blink mode & side-by-side view  
- Ideal for:
  - Car/motorsport inspection teams  
  - Manufacturing QA  
  - Engineering surface analysis  

---

## 🏗 Architecture Overview

```
VisuViewAI/
│
├── backend/
│ ├── server.js # Node.js backend server
│ ├── routes/
│ │ ├── auth.js # Authentication API
│ ├── middleware/
│ │ ├── authVerify.js # ID token validation
│ ├── compare.py
│ ├── app_streamlit_timeseries.py
│ ├── app_streamlit.py
│ ├── serviceAccountKey.json # Firebase Admin Key
│
├── public/
│ ├── index.html # Landing page
│ ├── compare.html # General comparison portal
│ ├── assets/
│ ├── css/
│ ├── js/
│ ├── auth.js # Firebase auth frontend
│ ├── main.js
└── README.md
```
---

##  Tech Stack

### Backend
- Node.js (Express)  
- Firebase Admin SDK (auth + Firestore)  
- Firestore Database  
- Python (OpenCV-based diff engine)  
- Cloudinary for heatmap storage  

### Frontend
- HTML, JavaScript, TailwindCSS  
- Streamlit dashboards (embedded via iframe)  
- Heatmap controls, sliders, UI animations  

### AI Layer
- Gemini 1.5 / 2.0  
- Summaries and region-based insights  

---

## 🔐 Authentication Workflow

VisuViewAI uses Firebase Authentication (Email + Password + Google Login).

Client-side stores:

