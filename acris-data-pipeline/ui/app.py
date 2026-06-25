import sys
import os
import tempfile

import streamlit as st

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

from transform.pdf_parser import extract_text_from_pdf
from transform.cleaner import clean_text
from transform.regulation_extractor import extract_regulations
from ml.regulation_analyzer import analyze_regulation
from ml.change_detector import detect_changes

# ─── Page config ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="ReguFlow AI — Regulatory Change Detector",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─── Global CSS ───────────────────────────────────────────────────────────────

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    /* Dark app background */
    .stApp {
        background: linear-gradient(135deg, #0a0f1e 0%, #0d1117 50%, #0f172a 100%);
        color: #e2e8f0;
    }

    /* Hide Streamlit chrome */
    #MainMenu, footer, header { visibility: hidden; }

    /* Hero header */
    .reguflow-header {
        background: linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #7c3aed 100%);
        border-radius: 16px;
        padding: 36px 40px;
        margin-bottom: 28px;
        box-shadow: 0 20px 60px rgba(99,102,241,0.35);
        position: relative;
        overflow: hidden;
    }
    .reguflow-header::before {
        content: '';
        position: absolute;
        top: -60px; right: -60px;
        width: 260px; height: 260px;
        background: rgba(255,255,255,0.06);
        border-radius: 50%;
    }
    .reguflow-header h1 {
        font-size: 2.2rem;
        font-weight: 800;
        color: #fff;
        margin: 0 0 8px;
        letter-spacing: -0.5px;
    }
    .reguflow-header p {
        color: rgba(255,255,255,0.72);
        font-size: 1rem;
        margin: 0;
    }
    .badge-pill {
        display: inline-block;
        background: rgba(255,255,255,0.15);
        color: #fff;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.25);
        margin-right: 6px;
    }

    /* Upload zone */
    .upload-zone {
        border: 2px dashed #4f46e5;
        border-radius: 14px;
        padding: 28px;
        text-align: center;
        background: rgba(79,70,229,0.06);
        transition: border-color 0.2s;
    }

    /* Metric card */
    .metric-card {
        background: rgba(30,41,59,0.85);
        border: 1px solid rgba(99,102,241,0.22);
        border-radius: 14px;
        padding: 20px 24px;
        text-align: center;
        backdrop-filter: blur(8px);
    }
    .metric-card .label {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #94a3b8;
        margin-bottom: 6px;
    }
    .metric-card .value {
        font-size: 1.8rem;
        font-weight: 800;
        color: #e2e8f0;
    }
    .metric-card .sub {
        font-size: 0.78rem;
        color: #64748b;
        margin-top: 4px;
    }

    /* Change cards */
    .change-card {
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 12px;
    }
    .change-card.added {
        background: rgba(16,185,129,0.08);
        border: 1px solid rgba(16,185,129,0.2);
        border-left: 4px solid #10b981;
    }
    .change-card.modified {
        background: rgba(245,158,11,0.08);
        border: 1px solid rgba(245,158,11,0.2);
        border-left: 4px solid #f59e0b;
    }
    .change-card.removed {
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.2);
        border-left: 4px solid #ef4444;
    }

    /* Divider */
    .section-divider {
        border: none;
        border-top: 1px solid rgba(71,85,105,0.3);
        margin: 20px 0;
    }

    /* Empty state */
    .empty-state {
        text-align: center;
        padding: 40px;
        color: #475569;
    }
    .empty-state .icon { font-size: 2.5rem; margin-bottom: 10px; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ─── Hero header ──────────────────────────────────────────────────────────────

st.markdown(
    """
    <div class="reguflow-header">
        <div>
            <span class="badge-pill">⚖️ AI-Powered</span>
            <span class="badge-pill">🔍 Difference Engine</span>
        </div>
        <h1 style="margin-top:14px;">ReguFlow AI</h1>
        <p>Regulatory Difference Engine — Detect additions, modifications, and removals between regulations</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# ─── File upload ──────────────────────────────────────────────────────────────

st.markdown(
    '<div class="upload-zone">',
    unsafe_allow_html=True,
)
uploaded_file = st.file_uploader(
    "📂  Upload Regulatory PDF Document",
    type=["pdf"],
    help="Upload the updated regulation PDF to compare against the database version.",
)
st.markdown("</div>", unsafe_allow_html=True)

if not uploaded_file:
    st.markdown(
        """
        <div class="empty-state">
            <div class="icon">⚖️</div>
            <p>Upload a regulatory PDF to see changes instantly.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.stop()

# ─── Analysis pipeline ────────────────────────────────────────────────────────

with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
    tmp.write(uploaded_file.read())
    pdf_path = tmp.name

progress = st.progress(0, "🔍 Extracting text from PDF…")

try:
    text = extract_text_from_pdf(pdf_path)
    progress.progress(25, "🧹 Cleaning and normalising text…")

    cleaned = clean_text(text)
    progress.progress(50, "🧠 Finding reference regulation…")

    report = analyze_regulation(cleaned)
    progress.progress(75, "🔄 Detecting sentence-level changes…")

    old_text = report.get("matched_regulation", "")
    new_reg_text = extract_regulations(cleaned)
    line_changes = detect_changes(old_text, new_reg_text)
    progress.progress(90, "📊 Rendering comparison…")

except Exception as e:
    progress.empty()
    st.error(f"⚠️ **Comparison Failed**: {str(e)}")
    st.info("💡 Please make sure the uploaded PDF is a valid regulatory document, and that ChromaDB and Supabase are populated and reachable.")
    st.stop()
finally:
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except Exception:
            pass

progress.progress(100, "✅ Analysis complete!")
progress.empty()

# ─── Display Differences ───────────────────────────────────────────────────────

modified_sentences = line_changes.get("modified", [])
n_modified = len(modified_sentences)

st.markdown(
    f"""
    <div style="display:flex; justify-content:center; margin:20px 0;">
        <div class="metric-card" style="width:320px; border-color:rgba(245,158,11,0.35);">
            <div class="label">Changed Regulations</div>
            <div class="value" style="color:#fbbf24;">{n_modified}</div>
            <div class="sub">Updated regulatory content detected</div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown("<div class='section-divider'></div>", unsafe_allow_html=True)
st.markdown("<h3 style='text-align: center;'>🔄 Detected Regulatory Changes</h3>", unsafe_allow_html=True)
st.markdown(
    "<p style='color:#64748b; font-size:0.85rem; margin-top:-8px; text-align: center;'>"
    "Sentences and clauses that have changed from the reference regulation stored in the database.</p>",
    unsafe_allow_html=True,
)

col_left, col_mid, col_right = st.columns([1, 6, 1])

with col_mid:
    if not modified_sentences:
        st.markdown(
            '<div class="empty-state" style="padding:40px;"><p>No regulatory changes/modifications detected.</p></div>',
            unsafe_allow_html=True
        )
    else:
        for idx, item in enumerate(modified_sentences, 1):
            sim_pct = round(item["similarity"] * 100, 1)
            st.markdown(
                f"""<div class="change-card modified">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.68rem; font-weight:700; color:#fbbf24; letter-spacing:1px; text-transform:uppercase;">Change #{idx}</span>
                            <span style="font-size:0.72rem; color:#64748b;">{sim_pct}% match</span>
                        </div>
                        <div style="margin-top:8px;">
                            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Previous version (Database):</div>
                            <p style="color:#94a3b8; font-size:0.82rem; margin:2px 0 8px 0; text-decoration:line-through; line-height:1.4;">{item['old']}</p>
                            <div style="font-size:0.75rem; color:#fbbf24; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Updated version (Uploaded PDF):</div>
                            <p style="color:#e2e8f0; font-size:0.85rem; margin:2px 0 0 0; line-height:1.4; font-weight:500;">{item['new']}</p>
                        </div>
                    </div>""",
                unsafe_allow_html=True,
            )