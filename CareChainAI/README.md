# HealthVault — AI-Powered Universal Health Record System

> Academic CS Semester Project · Full-Stack · AI/RAG · Agent Architecture

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  Dashboard · Upload · Timeline · Ask AI · Emergency QR           │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────▼─────────────────────────────────────┐
│                       BACKEND (FastAPI)                          │
│                                                                  │
│  /auth   /reports   /timeline   /ai/ask   /emergency             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    AGENT PIPELINE                        │    │
│  │                                                          │    │
│  │  Upload ──► Ingestion Agent ──► Timeline Agent           │    │
│  │                    │                    │                │    │
│  │                    ▼                    ▼                │    │
│  │             Text Extraction     DB Update (date,         │    │
│  │             (pdfplumber/OCR)    type, hospital, etc.)    │    │
│  │                    │                                     │    │
│  │                    ▼                                     │    │
│  │             RAG Agent                                    │    │
│  │          (Embed → FAISS → Gemini)                       │    │
│  │                    │                                     │    │
│  │                    ▼                                     │    │
│  │             Critic Agent  ──► Safe Response              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────────┐    │
│  │ SQLite/  │   │  FAISS   │   │ Local Storage / S3        │    │
│  │Postgres  │   │  Index   │   │ (uploaded files)          │    │
│  └──────────┘   └──────────┘   └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | SQLAlchemy 2.0 (async) |
| OCR | Tesseract via pytesseract |
| PDF Parsing | pdfplumber |
| LLM | Gemini 1.5 Flash |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Vector DB | FAISS (CPU) |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
healthvault/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py            # Settings (Pydantic BaseSettings)
│   │   │   ├── security.py          # JWT + bcrypt
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   └── session.py           # Async SQLAlchemy engine
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── report.py
│   │   │   └── embedding.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   └── report.py
│   │   ├── agents/
│   │   │   ├── ingestion_agent.py   # PDF/OCR text extraction
│   │   │   ├── timeline_agent.py    # Metadata extraction
│   │   │   ├── rag_agent.py         # FAISS + Gemini Q&A
│   │   │   ├── critic_agent.py      # Safety validation
│   │   │   └── orchestrator.py      # Pipeline coordinator
│   │   └── api/
│   │       ├── deps.py              # JWT auth dependency
│   │       └── routes/
│   │           ├── auth.py
│   │           ├── reports.py
│   │           ├── timeline.py
│   │           ├── ai.py
│   │           └── emergency.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── upload/page.tsx
│   │   │   ├── timeline/page.tsx
│   │   │   ├── ask-ai/page.tsx
│   │   │   └── emergency/page.tsx
│   │   ├── lib/
│   │   │   └── api.ts               # Typed API client
│   │   └── hooks/
│   │       └── useAuth.tsx
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Quick Start (Development)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install Tesseract (system package)
# Ubuntu:  sudo apt install tesseract-ocr
# macOS:   brew install tesseract

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### 3. Docker (Full Stack)

```bash
# From project root
docker-compose up --build
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login, get JWT |
| GET | /api/auth/me | Current user profile |
| POST | /api/reports/upload | Upload medical document |
| GET | /api/reports/ | List user's reports |
| GET | /api/reports/{id} | Get single report |
| DELETE | /api/reports/{id} | Delete report |
| GET | /api/timeline/ | Chronological health timeline |
| POST | /api/ai/ask | Ask AI about records |
| GET | /api/emergency/profile | Get emergency profile |
| PUT | /api/emergency/profile | Update emergency info |
| GET | /api/emergency/qr | Generate QR token |
| GET | /api/emergency/public/{token} | Public emergency view |

---

## Agent Pipeline Detail

### Ingestion Agent
- Detects PDF vs image
- PDF: pdfplumber text extraction → fallback to pdf2image + Tesseract for scanned PDFs
- Image: PIL + pytesseract OCR
- Cleans/normalises extracted text

### Timeline Agent
- Regex-based date extraction (multiple formats)
- Keyword scoring for report type classification
- Named entity extraction (hospital, doctor, medications)
- Extractive summarisation

### RAG Agent
- Chunks text into 500-char overlapping windows
- Embeds with sentence-transformers (all-MiniLM-L6-v2)
- Stores vectors in FAISS IndexFlatIP (cosine via L2 normalisation)
- Retrieves top-5 chunks on query
- Constructs grounded prompt → Gemini 1.5 Flash
- User-scoped retrieval (only searches own reports)

### Critic Agent
- Rule-based safety checks (no diagnosis claims, no treatment instructions)
- Automatic language softening for flagged outputs
- Ensures disclaimer is always appended

### Orchestrator
- Background task (FastAPI BackgroundTasks)
- Coordinates: Ingest → Timeline → Embed pipeline
- Updates report status: pending → processing → done/failed

---

## Security

- Passwords hashed with bcrypt
- JWT with configurable expiry (default 24h)
- Patient data isolation (all queries scoped by user_id)
- Emergency QR uses time-limited signed tokens (24h expiry)
- Critic agent prevents AI from generating medical advice

---

## Production Notes

- Replace SQLite with PostgreSQL (`DATABASE_URL=postgresql+asyncpg://...`)
- Use Alembic for database migrations
- Store uploads in S3 / Cloudinary instead of local disk
- Use Redis for caching frequent RAG queries
- Add rate limiting (slowapi)
- Enable HTTPS with nginx reverse proxy

---

*Built for academic demonstration — not for clinical use.*
