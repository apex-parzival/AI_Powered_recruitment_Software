# TalentAI — AI-Powered Recruitment Platform

<div align="center">

![TalentAI](https://img.shields.io/badge/TalentAI-AI%20Recruitment-7C3AED?style=for-the-badge&logo=sparkles)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
![Gemini](https://img.shields.io/badge/Google-Gemini%20Flash%202.0-4285F4?style=for-the-badge&logo=google)
![GoogleAuth](https://img.shields.io/badge/Google-OAuth%202.0-EA4335?style=for-the-badge&logo=google)
![Responsive](https://img.shields.io/badge/Responsive-Mobile%20Ready-22C55E?style=for-the-badge&logo=css3)

*End-to-end AI hiring platform: resume scoring, live interviews with real-time transcription, and AI-generated ACCEPT/HOLD/REJECT verdicts — all powered by Gemini Flash 2.0. Featuring Google OAuth for secure recruiter login, lazy-loaded pages, and full dark-mode support.*

</div>

---

## ✨ Features

### 🔐 Authentication
- **Google Sign-In** for Recruiters — one-click OAuth 2.0 login via `@react-oauth/google`
- **Employee login** — email + password form
- **Auth Guard** — all routes protected; unauthenticated users redirected to `/login`
- Google profile picture shown in sidebar avatar

### 📄 AI Resume Screening
- **Structured extraction** via Gemini Flash 2.0 — name, email, skills, experience, education, companies
- **AI Criteria Generation** — Auto-extracts a 7-field JSON schema from job descriptions
- **Criteria Editor Modal** — Add custom requirements and set Job-level weights (Resume/Interview/Tech/Rating)
- **Multi-dimensional scoring** (0–100 per criterion) with evidence quotes
- **Bulk upload** — 1000+ PDFs via 64KB streaming chunks + 16-worker thread pool
- **JD Parsing** — Upload Job Description as PDF/Docx to auto-extract text during Job Creation

### 🎥 Live Interview System
- **Jitsi Meet** integration — free, embeddable video conferencing (no API key required)
- **Real-time Speech-to-Text** — Browser Web Speech API with auto-restart, live interim text, Interviewer/Candidate speaker labels
- **Deepgram Fallback** — High-accuracy audio chunk processing if Web Speech API unavailable
- **AI Co-pilot** — Gemini generates smart follow-up questions every 3 utterances (HIGH/MEDIUM priority)
- **Post-interview evaluation** — Gemini cross-references spoken answers vs resume claims
- **Technical Assessments** — AI-generated timed coding/scenario quizzes, auto-evaluated

### 🏆 Final Assessment Engine
- **Dynamic composite formula** — interactive sliders for Resume/Interview/Tech/Recruiter weighting
- **5-level recruiter rating**: Strong Hire → Strong No Hire
- **ACCEPT / HOLD / REJECT** verdict with Gemini-written narrative, strengths, and concerns

### 🎨 Responsive Glassmorphism UI
- **Dark mode** with improved palette — clear text contrast in sidebar and all nav elements
- **Mobile-first layout** — collapsible off-canvas sidebar with hamburger toggle
- Horizontal-scrollable data tables on small screens
- Lazy-loaded pages via `React.lazy` + `Suspense` for fast initial load
- Inter font, animated transitions, glass cards

---

## 🏗️ Architecture

```
web/
├── backend/                    # FastAPI + SQLAlchemy + SQLite
│   ├── main.py                 # All API endpoints + /auth/google
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response models
│   ├── resume_parser.py        # Gemini Flash resume extraction + scoring
│   ├── interview_service.py    # Jitsi room creation, AI follow-ups, evaluation
│   ├── ai_service.py           # Criteria generation via Gemini
│   ├── audio_service.py        # Deepgram STT helpers
│   ├── seed.py                 # Demo data: 50 jobs, 120 candidates, 150 applications
│   └── database.py             # SQLAlchemy engine + session
│
└── frontend/                   # React 18 + TypeScript + Vite
    └── src/
        ├── components/
        │   └── Layout.tsx      # Responsive sidebar, Google avatar, hamburger, dark mode
        ├── pages/
        │   ├── Login.tsx           # Google Sign-In (Recruiter) + email/password (Employee)
        │   ├── Dashboard.tsx       # Stats, verdict distribution, recent activity
        │   ├── Jobs.tsx            # Job board with search & filter
        │   ├── JobPipeline.tsx     # Per-job candidate pipeline + bulk upload
        │   ├── Candidates.tsx      # Cross-job candidate tracker
        │   ├── Interviews.tsx      # Interview session list
        │   ├── InterviewRoom.tsx   # Jitsi embed + live STT + AI co-pilot
        │   ├── InterviewReport.tsx # Full post-interview transcript & scores
        │   ├── FinalEvaluation.tsx # Composite scoring with weight sliders
        │   ├── Evaluations.tsx     # All final verdicts across candidates
        │   └── Profile.tsx         # User settings
        ├── App.tsx             # Routes + AuthGuard + GoogleOAuthProvider + lazy loading
        ├── api.ts              # Axios client + all API calls + error interceptor
        └── index.css           # Design tokens, glassmorphism, dark mode, responsive
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API key (free tier works)
- Google OAuth Client ID (for recruiter login)

### 1. Backend

```powershell
cd web/backend

# Create and activate venv
python -m venv venv
.\venv\Scripts\Activate.ps1        # Windows PowerShell
# source venv/bin/activate         # Mac/Linux

pip install -r requirements.txt

# Create .env
echo GEMINI_API_KEY=your_key_here > .env

# Start server (use venv python directly — avoids PATH issues)
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

### 2. Seed Demo Data (optional but recommended)

```powershell
.\venv\Scripts\python.exe seed.py
# Creates: 50 jobs · 120 candidates · 150 applications · 80 interviews · 55 evaluations
```

### 3. Frontend

```powershell
cd web/frontend
npm install

# Create .env with your Google OAuth Client ID
# VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
# VITE_API_URL=http://localhost:8000

npm run dev
# Open http://localhost:5173
```

### 4. Login

| Role | Method |
|------|--------|
| **Recruiter** | Click **Sign in with Google** |
| **Employee** | Enter any email + password |

---

## 🔑 Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID**
3. Type: **Web application**
4. Authorized JavaScript origins: `http://localhost:5173`
5. Copy Client ID → paste into `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`
6. Restart `npm run dev`

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/google` | Verify Google ID token, return user profile |
| `GET` | `/stats` | Dashboard statistics |
| `GET/POST` | `/jobs` | List / create jobs |
| `POST` | `/jobs/{id}/resumes/upload` | Bulk resume upload |
| `GET` | `/jobs/{id}/applications` | Candidate pipeline for a job |
| `GET` | `/candidates` | All candidates with scores |
| `POST` | `/interviews/start` | Create Jitsi room + interview session |
| `GET` | `/interviews/{id}` | Get session with transcript |
| `POST` | `/interviews/{id}/transcript` | Add transcript chunk, get AI suggestions |
| `POST` | `/interviews/{id}/end` | End session, trigger evaluation |
| `GET` | `/interviews/{id}/report` | Full post-interview report |
| `POST` | `/assessments/technical/generate` | Generate technical quiz |
| `POST` | `/assessments/final` | Submit final weighted verdict |

---

## 🗄️ Database Models

| Model | Key Fields |
|-------|-----------|
| `Job` | title, description, department, criteria_versions |
| `CriteriaVersion` | criteria_config (JSON), is_active, version |
| `Candidate` | name, email, resume_path, structured_data |
| `Application` | resume_score, score_breakdown, interview_evaluation, final_assessment, status |
| `InterviewSession` | meet_link, jitsi_room, transcript_data, ai_suggestions, status |
| `TechnicalAssessment` | questions (JSON), answers, score, access_token |
| `FinalEvaluation` | resume_score, interview_score, technical_score, subjective_score, final_score, verdict |

---

## 📱 Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| `> 1024px` | Full 3-column desktop layout, full sidebar |
| `768px – 1024px` | Tablet: sidebar narrows, interview room loses AI panel |
| `< 768px` | Mobile: off-canvas sidebar with hamburger toggle, single-column grids, scrollable tables |
| `< 480px` | Small mobile: single-column stat cards, compact buttons |

---

## 🔧 Configuration

| Variable | Location | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | `backend/.env` | Required for all AI features |
| `VITE_GOOGLE_CLIENT_ID` | `frontend/.env` | Required for Recruiter Google Sign-In |
| `VITE_API_URL` | `frontend/.env` | Backend URL (default: `http://localhost:8000`) |
| `JITSI_BASE` | hardcoded | `https://meet.jit.si` |
| `UPLOAD_DIR` | `main.py` | Resume PDF storage path |

---

## 🛠️ Tech Stack

**Backend:** FastAPI · SQLAlchemy · SQLite · Google Generative AI (Gemini Flash 2.0) · PyMuPDF · python-docx · httpx

**Frontend:** React 18 · TypeScript · Vite · React Router v6 · Axios · `@react-oauth/google` · Web Speech API · Jitsi Meet External API

**AI:** Google Gemini Flash 2.0 — resume extraction, multi-criterion scoring, interview follow-up generation, post-interview evaluation, final assessment narrative

---

<div align="center">

Built with ❤️ for modern AI-powered hiring

</div>
