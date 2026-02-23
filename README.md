# TalentAI — AI-Powered Recruitment Software

<div align="center">

![TalentAI](https://img.shields.io/badge/TalentAI-AI%20Recruitment-7C3AED?style=for-the-badge&logo=sparkles)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![Gemini](https://img.shields.io/badge/Google-Gemini%20Flash-4285F4?style=for-the-badge&logo=google)

*End-to-end AI hiring platform: resume scoring, live interviews, and ACCEPT/HOLD/REJECT verdicts — all powered by Gemini Flash 2.0*

</div>

---

## ✨ Features

### 📄 AI Resume Preprocessing & Scoring
- **Structured extraction** via Gemini Flash 2.0 — name, email, skills, experience, education, companies
- **Enhanced AI Criteria Generation** — Auto-extracts a precise 7-field JSON schema (Location, Salary, Tech Skills, etc.) from job descriptions
- **Criteria Editor Modal** — Manually add custom requirements and set precise Job-level default assessment weights (Resume/Interview/Tech/Rating)
- **Multi-dimensional scoring** against structured job criteria (0–100 per criterion) with evidence quotes
- **Bulk upload** — 1000+ PDFs via 64KB streaming chunks + 16-worker thread pool, batched DB commits of 50
- **Recommendation flag** — auto-tags top-percentile candidates for interview
- **JD Parsing** — Upload Job Description as PDF/Docx to auto-extract text during Job Creation

### 🎥 Live Interview System & Technical Assessments
- **Jitsi Meet** integration — free, embeddable video conferencing with no API key required
- **Web Speech API** — real-time browser-side speech-to-text; toggle Interviewer/Candidate speaker labels
- **Deepgram STT Fallback** — Optional high-accuracy audio chunk processing if Web Speech is unavailable
- **AI Co-pilot** — Gemini generates 3–4 smart follow-up questions every 3 utterances with HIGH/MEDIUM priority
- **Post-interview evaluation** — Gemini cross-references spoken answers vs resume claims, scores consistency
- **Technical Assessments** — AI-generated timed coding/scenario quizzes per candidate, evaluated automatically

### 🏆 Final Assessment Engine
- **Dynamic Composite Formula**: Hirers use interactive sliders to define precise 0-100% weights for Resume Analysis, Interview Score, Tech Assessment, and Recruiter Rating.
- **5-level recruiter rating**: Strong Hire → Strong No Hire
- **ACCEPT / HOLD / REJECT** verdict with gradient card, narrative, strengths, and concerns
- Full verdict history stored with per-criterion breakdowns

### 🎨 Glassmorphism UI
- Dark / light mode with CSS custom properties
- Full navigation: Dashboard · Jobs · Candidates · Interviews · Evaluations · Profile
- Responsive glassmorphism design with Inter font, animated transitions

---

## 🏗️ Architecture

```
web/
├── backend/          # FastAPI + SQLAlchemy + SQLite
│   ├── main.py       # All API endpoints (jobs, resumes, interviews, assessments)
│   ├── models.py     # SQLAlchemy ORM models
│   ├── resume_parser.py   # Gemini Flash resume extraction + scoring
│   ├── interview_service.py # Jitsi room creation, AI follow-ups, evaluation
│   ├── ai_service.py       # Ollama fallback + criteria generation
│   ├── audio_service.py    # STT mock helpers
│   ├── seed.py       # Demo data: 50 jobs, 120 candidates, 150 applications, 80 interviews
│   ├── database.py   # SQLAlchemy engine + session
│   ├── schemas.py    # Pydantic request/response models
│   └── .env          # GEMINI_API_KEY goes here
│
├── frontend/         # React 18 + TypeScript + Vite + TailwindCSS
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx       # Live stats + verdict distribution
│       │   ├── Jobs.tsx            # 50 job cards with AI criteria
│       │   ├── JobPipeline.tsx     # Bulk resume upload + candidate table
│       │   ├── Candidates.tsx      # 120 candidates with real scores
│       │   ├── Interviews.tsx      # Session table with scores + verdicts
│       │   ├── InterviewRoom.tsx   # 3-panel: STT + Jitsi + AI co-pilot
│       │   ├── InterviewReport.tsx # 2-tab: transcript + Gemini eval
│       │   ├── FinalEvaluation.tsx # ACCEPT/HOLD/REJECT verdict card
│       │   └── ...
│       └── api.ts    # Axios wrapper for all API calls
│
└── runner.py         # Starts both backend and frontend together
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Google AI API key** (free at https://aistudio.google.com/app/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/apex-parzival/AI_Powered_recruitment_Software.git
cd AI_Powered_recruitment_Software

# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure API Key

```bash
# backend/.env
GEMINI_API_KEY=YOUR_GOOGLE_AI_API_KEY_HERE
```
> Without the key, the system falls back to mock scores — everything still works.

### 3. Seed Demo Data (optional)

```bash
cd backend
venv\Scripts\python seed.py
```

This creates:
| Entity | Count |
|--------|-------|
| Jobs | 50 (12 departments) |
| Candidates | 120 |
| Applications | 150 |
| Interview Sessions | 80 |
| Final Evaluations | 55 |

### 4. Run Everything

```bash
# From project root — starts backend + frontend together
python runner.py
```

Or separately:
```bash
# Terminal 1 — Backend
cd backend && venv\Scripts\python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Platform-wide counts and metrics |
| `GET` | `/jobs` | All jobs with application counts and criteria |
| `POST` | `/jobs` | Create a new job requisition |
| `POST` | `/jobs/{id}/criteria/generate` | AI-generate scoring criteria |
| `POST` | `/jobs/{id}/resumes/upload` | Bulk PDF upload (1000+) |
| `GET` | `/candidates` | All candidates enriched with scores + verdicts |
| `POST` | `/interviews/start` | Create Jitsi meeting + session |
| `POST` | `/interviews/{id}/transcript` | Save STT chunk + get AI questions |
| `POST` | `/interviews/{id}/end` | End session + trigger Gemini eval |
| `GET` | `/interviews/{id}/report` | Full post-interview report |
| `POST` | `/assessments/technical/generate` | Generate candidate technical assessment |
| `POST` | `/assessments/technical/{token}/submit` | Submit and score technical assessment |
| `POST` | `/assessments/final` | Generate ACCEPT/HOLD/REJECT verdict |

---

## 🔒 Privacy & PII Handling

- Resume PDFs stored **locally** only — never sent to third parties except Gemini for analysis
- Only extracted text (no raw files) is sent to Gemini API
- All data stays in the local SQLite database (`backend/recruitment_app.db`)
- The `.env` file and DB file are excluded from version control via `.gitignore`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | FastAPI, SQLAlchemy, SQLite |
| AI | Google Gemini Flash 2.0 (`gemini-2.0-flash`), Ollama (Local LLM fallback) |
| Video | Jitsi Meet (free, no API key) |
| STT | Web Speech API (Chrome), Deepgram SDK |
| Document Parsing | PyMuPDF (fitz), python-docx |

---

## 📋 Interview Flow

```
Upload Resumes → Gemini Flash scores each PDF against criteria
                    ↓
Start Interview → Jitsi Meet room created → /interview-room/{id}
                    ↓
     Speak → Web STT → transcript saved → Gemini suggests follow-up Qs
                    ↓
End Interview → Gemini evaluates transcript vs resume → /interview-report/{id}
                    ↓
Final Assessment → Recruiter rates → ACCEPT / HOLD / REJECT
```

---

## 📜 License

MIT — free to use, modify, and distribute.
