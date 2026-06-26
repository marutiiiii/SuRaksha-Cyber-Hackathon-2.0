# ReguFlow Validator 🛡️📋

An AI-powered compliance management platform that automatically extracts regulations from documents, generates actionable compliance tasks, accepts evidence documents (PDFs and images), and verifies compliance using a hybrid semantic matching engine and a locally hosted multimodal Large Language Model (Qwen2.5-VL).

---

## 🚀 Features

### 📄 Regulation Processing

* Upload regulation documents (PDF/TXT)
* Extract text from regulations automatically
* Generate department-specific compliance tasks
* Store and manage regulations in a centralized registry

### 🤖 AI-Powered Compliance Verification

* Upload compliance evidence as:

  * PDF documents
  * Screenshots
  * Images
* Extract evidence from digital PDFs and scanned documents
* OCR support using Qwen2.5-VL for images and screenshots
* Verify evidence against compliance requirements
* Generate confidence scores and audit reasoning
* Detect missing or incomplete requirements

### ⚡ Hybrid Verification Engine

* Fast-path semantic verification for text documents
* Qwen fallback for complex, scanned, or low-confidence evidence
* Automatic PDF optimization:

  * Digital PDFs → Direct text extraction
  * Scanned PDFs → OCR and image understanding

### 📊 Dashboard & Tracking

* Compliance task dashboard
* Regulation registry
* Task status tracking
* Verification reports
* Compliance statistics and progress monitoring

---

## 🏗️ System Architecture

Regulation Upload
↓
Text Extraction
↓
AI Task Generation
↓
Compliance Tasks
↓
Evidence Upload (PDF/Image)
↓
Hybrid Verification Engine
↓
Confidence Scoring
↓
Audit Report Generation
↓
Dashboard & Tracking

---

## 🛠️ Tech Stack

### Backend

* Python 3.10+
* FastAPI
* Uvicorn

### AI & Machine Learning

* Qwen2.5-VL-3B-Instruct
* Transformers
* PyTorch
* Hybrid Semantic Matching Engine

### Document Processing

* PyMuPDF
* Pillow
* PDF Processing Utilities

### Database

* SQLite

### Frontend

* HTML
* CSS
* JavaScript

---

## 📂 Project Structure

```text
ReguFlow-Validator/
│
├── models/
├── services/
├── static/
├── uploads/
├── utils/
│
├── config.py
├── evidence_analyzer.py
├── evidence_extractor.py
├── qwen_model.py
├── regulation_extractor.py
├── requirement_matcher.py
├── status_engine.py
├── task_generator.py
├── validator.py
├── test_system.py
├── requirements.txt
└── reguflow.db
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone <repository-url>
cd ReguFlow-Validator
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Environment

Windows:

```bash
venv\Scripts\activate
```

Linux/Mac:

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🤖 Qwen Model Setup

Download:

**Qwen2.5-VL-3B-Instruct**

Place the model at:

```text
C:\AI-Models\Qwen2.5-VL-3B-Instruct
```

Or configure your own path:

```env
MODEL_PATH=C:\AI-Models\Qwen2.5-VL-3B-Instruct
```

---

## ▶️ Running the Application

```bash
python validator.py
```

Open:

```text
http://127.0.0.1:8000
```

---

## 🔄 Workflow

### 1. Upload Regulation

* Upload RBI circular, policy document, or regulation PDF.

### 2. Generate Compliance Tasks

The system extracts requirements and creates actionable tasks.

### 3. Upload Evidence

Upload:

* Policy PDFs
* Screenshots
* Images
* Implementation documents

### 4. Verify Proof

The AI auditor:

* Extracts evidence
* Matches requirements
* Performs semantic verification
* Uses Qwen reasoning when necessary
* Generates confidence scores and reports

---

## 📈 Compliance States

### NOT_STARTED

Requirements not satisfied.

### IN_PROGRESS

Partial evidence found.

### COMPLETED

Requirements successfully satisfied.

---

## 📊 Verification States

### QUEUED

Verification request submitted.

### PROCESSING

AI auditor is analyzing evidence.

### COMPLETED

Verification completed successfully.

### FAILED

Verification failed or encountered an error.

---

## 🎯 Example Use Cases

* Banking Regulation Compliance
* Internal Policy Audits
* Financial Compliance Monitoring
* Evidence-Based Compliance Verification
* Regulatory Documentation Management
* Enterprise Audit Automation

---

## ✨ Key Highlights

* Fully offline AI processing
* Local multimodal LLM integration
* PDF and image verification support
* Hybrid semantic matching engine
* Automated task generation
* Confidence-based compliance scoring
* Real-time dashboard and tracking
* End-to-end AI compliance workflow

---

## 👨‍💻 Developed By

Suraj Sanjay Ghodke

B.Tech – Artificial Intelligence & Data Science

AI • Machine Learning • Data Science • Full Stack Development
