# ReguFlow AI (ACRIS) — System Documentation

ReguFlow AI is an end-to-end regulatory compliance intelligence system. It automates the scraping of regulatory notifications (specifically from the Reserve Bank of India - RBI), cleans and chunks the text, stores documents in relational and vector databases, performs sentence-level difference detection on updated drafts, generates Measurable Action Points (MAPs) for affected departments, and hosts a RAG-powered chatbot for interactive querying.

---

## 1. High-Level Architecture Overview

The system is organized into four main layers:

```
[ INGESTION LAYER ]        --->    [ STORAGE LAYER ]
- Scrapes RBI notifications        - Supabase PostgreSQL (Relational)
- Downloads & parses PDFs          - ChromaDB Cloud (Vector Store)
- Cleans and chunks text                    |
                                            v
[ PRESENTATION LAYER ]      <---    [ AI INTELLIGENCE LAYER ]
- Streamlit Diff UI                 - Matcher & Segment Alignment
- Streamlit RAG Chatbot             - Multi-dimensional Risk Scoring
                                    - MAP Task Generator & Evidence Mapper
```

---

## 2. Component and Module Directory

### A. Ingestion & Transformation (`extract/` & `transform/`)
*   **`extract/rbi.py`**: Scrapes the RBI notifications index page. It reads update headers and fetches subsequent pages to extract the direct PDF links.
*   **`transform/pdf_downloader.py`**: Downloads target PDF files over HTTP to a local raw directory (`data/raw/`).
*   **`transform/pdf_parser.py`**: Extracts text content page-by-page from downloaded PDFs using `fitz` (PyMuPDF).
*   **`transform/cleaner.py`**: Standardizes whitespace by collapsing multiple newlines, tabs, and duplicate spaces into a single space.
*   **`transform/regulation_extractor.py`**: Evaluates regulatory priority. It filters out administrative boilerplate and preambles by scoring paragraphs using keywords (*shall*, *must*, *penalty*), retaining text scoring $\ge 3$.
*   **`transform/chunker.py`**: Splits filtered text into sliding or direct chunks of 500 words for embedding.

### B. Relational & Vector Storage (`load/` & `ml/`)
*   **`load/supabase_loader.py`**: Connects to the Supabase client. Checks if a file has already been parsed (by matching `pdf_name`) and inserts circular records and chunk tables.
*   **`ml/embedding_generator.py`**: Uses the `sentence-transformers` library to load `BAAI/bge-large-en-v1.5` and generate 1024-dimensional normalized float vectors for text chunks.
*   **`ml/chroma_loader.py`**: Interfaces with the ChromaDB CloudClient. Manages the `regulations_bge` vector collection, storing document strings along with their embeddings and metadata.

### C. Analysis & Comparison Engine (`ml/`)
*   **`ml/clause_extractor.py`**: Standardizes and extracts formal structural clauses (e.g., section numbers, headings, text) and highlights obligation keywords.
*   **`ml/clause_comparator.py`**: Matches clauses between old and new document versions, classifying them into `added`, `modified`, or `removed` groups.
*   **`ml/change_detector.py`**: Performs sentence-level diff alignments to highlight exact sentence pairs that changed.
*   **`ml/change_explainer.py`**: Generates human-readable summaries explaining the legal differences.
*   **`ml/impact_analyzer.py`**: Detects affected operational areas (Compliance, IT, Audit, Operations, Finance) and scores risk impact.
*   **`ml/risk_scorer.py`**: Computes an overall risk score (0 to 100) based on similarity indices, obligation density, and clause edits.
*   **`ml/map_generator.py`**: Translates clause changes into Measurable Action Points (MAPs) containing descriptive compliance tasks, owner departments, priorities, and implementation deadlines.
*   **`ml/evidence_mapper.py`**: Maps generated compliance action points to validation proof items (e.g., audit trails, board minutes, modified policies).
*   **`ml/citation_tracker.py`**: Tracks reference citations linking back to original sources.
*   **`ml/regulation_analyzer.py`**: The primary orchestrator running the **9-step regulatory intelligence pipeline**.

### D. Retrieval-Augmented Generation (RAG) (`ml/`)
*   **`ml/rag_chatbot.py`**: The top-level orchestrator for the chatbot logic.
*   **`ml/rag_retriever.py`**: Generates embeddings for user questions and performs vector search in ChromaDB.
*   **`ml/rag_generator.py`**: Constructs a system prompt using retrieved context and invokes a local **Ollama** server running **`llama3`** (via `http://localhost:11434/api/generate`) to generate context-bounded answers.

### E. User Interface Frontends (`ui/`)
*   **`ui/app.py`**: Streamlit dashboard showing sentence-level changes between an uploaded PDF and its matched database equivalent.
*   **`ui/chatbot.py`**: Streamlit application exposing the RAG chatbot interface.

---

## 3. Database Schema Layout

### Relational Schema (Supabase PostgreSQL)
1.  **`regulations` Table**:
    *   `id` (BigInt/UUID, PK): Auto-generated ID.
    *   `title` (Text): The regulation title.
    *   `source` (Text): Source agency (`RBI`).
    *   `pdf_name` (Text, Unique): Used to prevent duplicate processing.
    *   `total_chunks` (Integer): Count of 500-word segments.
    *   `content` (Text): Full processed regulation text body.
2.  **`regulation_chunks` Table**:
    *   `id` (BigInt, PK): Auto-generated chunk ID.
    *   `regulation_id` (BigInt, FK): Points to `regulations.id`.
    *   `chunk_index` (Integer): Segment position.
    *   `chunk_text` (Text): Segment content text.

### Vector Schema (ChromaDB `regulations_bge` Collection)
*   **IDs**: Cast from the relational `regulation_chunks.id` string.
*   **Documents**: Raw text of the chunk (`chunk_text`).
*   **Embeddings**: 1024-dimensional normalized vector generated by `BAAI/bge-large-en-v1.5`.
*   **Metadata**: `{"regulation_id": regulation_id}`.

---

## 4. Operational Workflows

### Workflow A: The Ingestion Pipeline (`pipeline/run_pipeline.py`)
This script executes either on a schedule or manually to parse and index newly issued regulations:
```
[RBI Page] -> [Get PDF Url] -> [Download PDF] -> [Extract & Clean Text]
                                                     |
                                                     v
[ChromaDB Collection] <-- [Embedding] <-- [Insert to Supabase (Regulations & Chunks)]
```
1.  **RBI Scraper**: Requests the RBI notification index page, parses titles, URLs, and matches direct PDF download endpoints.
2.  **Duplicate Check**: Queries Supabase via `regulation_exists`. If matching `pdf_name` is found, execution skips.
3.  **PDF Parsing & Cleaning**: Downloads the PDF, extracts text using PyMuPDF, and compresses consecutive whitespace.
4.  **Priority Filtering**: Filters out preambles and administrative footnotes using scoring keyword rules.
5.  **Chunking**: Chunks remaining regulations text into 500-word blocks.
6.  **Supabase Load**: Writes regulation metadata and chunks, returning unique database IDs.
7.  **Vector Store Load**: Computes embeddings for the chunks using `sentence-transformers` and inserts documents, metadata, and embeddings into ChromaDB.
8.  **Clean up**: Deletes the local raw PDF.

### Workflow B: Comparison & Intelligence Pipeline (`regulation_analyzer.py`)
Triggered when a compliance draft or new circular is uploaded to the UI:
1.  **Extract Text**: The PDF is uploaded and parsed to cleaned text.
2.  **Vector Match**: The text is converted to a vector embedding and searched against the ChromaDB vector database to identify the closest historically stored reference regulation.
3.  **Retrieve Reference**: The matching reference regulation's content is loaded from Supabase using the matched ID.
4.  **Clause Extraction**: Both the new document and reference document are parsed into logical clauses.
5.  **Compute Difference**:
    *   `clause_comparator.py` maps the clauses and labels additions, modifications, and removals.
    *   `change_detector.py` aligns sentences in parallel to generate side-by-side visualization diffs.
6.  **Analyze Impact & Risk**:
    *   `impact_analyzer.py` classifies affected areas and legacy risk levels.
    *   `risk_scorer.py` evaluates multivariable risk scores.
7.  **Generate Action Items**:
    *   `map_generator.py` and `evidence_mapper.py` translate differences into MAPs (action tasks, priorities, departments, evidence required).
8.  **Output Report**: Returns a JSON payload visualized in the Streamlit UI.

### Workflow C: RAG Chatbot Query Execution
```
[User Question] -> [Generate Query Embedding (BGE)] -> [Query ChromaDB]
                                                             |
                                                             v
[Chat Response] <-- [Ollama (llama3) Endpoint] <-- [Inject Chunks to Context Prompt]
```
1.  **User Input**: User submits a question through the Streamlit Chatbot UI.
2.  **Retrieval**: `rag_retriever.py` computes an embedding using BGE-Large and queries ChromaDB to find the top 5 most similar text chunks.
3.  **Augmentation**: Joins the retrieved chunks and injects them into the context template prompt.
4.  **Generation**: Sends the formatted prompt to the local Ollama instance running `llama3` via HTTP POST and returns the response back to the Streamlit UI.