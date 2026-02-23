"""
Enhanced resume parser using Google Gemini Flash.
Handles structured extraction + multi-dimensional scoring against job criteria.
"""
import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Gemini setup ──────────────────────────────────────────────────────────────
try:
    import google.generativeai as genai
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        GEMINI_AVAILABLE = True
        print("[ResumeParser] ✅ Gemini Flash 2.0 ready")
    else:
        _gemini_model = None
        GEMINI_AVAILABLE = False
        print("[ResumeParser] ⚠️  GEMINI_API_KEY not set – using mock scoring. Set it in backend/.env")
except ImportError:
    _gemini_model = None
    GEMINI_AVAILABLE = False
    print("[ResumeParser] ⚠️  google-generativeai not installed – using mock scoring")

# ── PDF text extraction ───────────────────────────────────────────────────────
def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from PDF using PyMuPDF."""
    try:
        import fitz
        doc = fitz.open(pdf_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text.strip()
    except Exception as e:
        print(f"[ResumeParser] PDF extraction error: {e}")
        return ""

# ── Gemini parsing ────────────────────────────────────────────────────────────
def _call_gemini(prompt: str) -> str:
    """Call Gemini Flash and return the text response."""
    if not GEMINI_AVAILABLE or _gemini_model is None:
        return ""
    try:
        response = _gemini_model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[ResumeParser] Gemini API error: {e}")
        return ""

def extract_structured_fields(resume_text: str) -> dict:
    """
    Use Gemini Flash to extract structured fields from raw resume text.
    Returns: { name, email, phone, skills, experience_years, education, summary }
    """
    if not resume_text:
        return _mock_structured_fields()

    prompt = f"""You are an expert resume parser. Extract structured information from the resume below.
Return ONLY valid JSON with these exact fields:
{{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone or null",
  "skills": ["list", "of", "tech", "skills"],
  "experience_years": 0,
  "education": "highest degree and institution or null",
  "current_role": "most recent job title or null",
  "companies": ["list of employers"],
  "summary": "2-sentence professional summary"
}}

Resume text:
\"\"\"
{resume_text[:6000]}
\"\"\"

Respond with ONLY the JSON object, no markdown, no explanation."""

    raw = _call_gemini(prompt)
    try:
        # Strip markdown code fences if present
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return _mock_structured_fields()

def score_resume_against_criteria(resume_text: str, criteria_config: list, job_title: str = "") -> dict:
    """
    Use Gemini Flash to score a resume against each job criterion.
    criteria_config: [{ "name": str, "weight": float, "description": str }]
    Returns: { final_score, breakdown: [{ criterion, score, evidence, weight }], summary, recommendation }
    """
    if not resume_text:
        return _mock_score(criteria_config)

    criteria_str = "\n".join(
        f"- {c.get('name', c)}: weight={c.get('weight', 0.2) if isinstance(c, dict) else 0.2}"
        + (f", description: {c.get('description', '')}" if isinstance(c, dict) and c.get('description') else "")
        for c in criteria_config
    )

    prompt = f"""You are an expert technical recruiter evaluating a resume for the role: {job_title or 'Software Engineer'}.

Job criteria to evaluate against:
{criteria_str}

Resume:
\"\"\"
{resume_text[:6000]}
\"\"\"

Score the candidate on EACH criterion from 0-100, and extract specific evidence (quotes or paraphrases from the resume).
Also flag any red flags and calculate a final weighted score.

Return ONLY valid JSON in this exact format:
{{
  "final_score": 0.75,
  "breakdown": [
    {{
      "criterion": "criterion name",
      "score": 85,
      "weight": 0.4,
      "evidence": "specific evidence from resume",
      "verdict": "strong|adequate|weak|missing"
    }}
  ],
  "strengths": ["list of key strengths"],
  "red_flags": ["list of concerns or gaps"],
  "summary": "3-sentence recruiter assessment",
  "recommendation": "advance|hold|reject"
}}"""

    raw = _call_gemini(prompt)
    try:
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        result = json.loads(clean)
        # Ensure final_score is in 0-1 range
        if result.get("final_score", 0) > 1:
            result["final_score"] = result["final_score"] / 100
        return result
    except Exception as e:
        print(f"[ResumeParser] Scoring parse error: {e}, raw: {raw[:200]}")
        return _mock_score(criteria_config)

# ── Main pipeline ─────────────────────────────────────────────────────────────
def process_resume_pipeline(application_id: int):
    """
    Full pipeline: extract text → parse structure → score → save to DB.
    Called as a background task.
    """
    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        app = db.query(models.Application).filter(models.Application.id == application_id).first()
        if not app:
            return

        app.status = "processing"
        db.commit()

        # 1. Get the PDF path from candidate
        candidate = db.query(models.Candidate).filter(models.Candidate.id == app.candidate_id).first()
        if not candidate or not candidate.resume_path:
            app.status = "failed"
            db.commit()
            return

        # 2. Extract raw text
        resume_text = extract_text_from_pdf(candidate.resume_path)

        # 3. Extract structured fields via Gemini
        structured = extract_structured_fields(resume_text)
        app.resume_structured_data = json.dumps(structured)

        # Update candidate name if extracted
        if structured.get("name") and candidate.name in (candidate.resume_path, ""):
            candidate.name = structured["name"]
        if structured.get("email") and not candidate.email:
            candidate.email = structured.get("email", "")

        # 4. Get job criteria
        job = db.query(models.Job).filter(models.Job.id == app.job_id).first()
        criteria_list = []
        if job:
            criteria_ver = (
                db.query(models.CriteriaVersion)
                .filter(models.CriteriaVersion.job_id == job.id, models.CriteriaVersion.is_active == True)
                .order_by(models.CriteriaVersion.version_number.desc())
                .first()
            )
            if criteria_ver:
                try:
                    criteria_list = json.loads(criteria_ver.criteria_config)
                except Exception:
                    criteria_list = []

        # 5. Score via Gemini
        if not criteria_list:
            criteria_list = [
                {"name": "Technical Skills", "weight": 0.3},
                {"name": "Experience", "weight": 0.3},
                {"name": "Education", "weight": 0.2},
                {"name": "Communication", "weight": 0.2},
            ]

        score_result = score_resume_against_criteria(
            resume_text, criteria_list, job.title if job else ""
        )

        # 6. Save
        app.resume_score = score_result.get("final_score", 0.5)
        app.score_breakdown = json.dumps(score_result)
        app.recommendation_flag = score_result.get("recommendation", "hold") == "advance"
        app.status = "completed"
        db.commit()

        print(f"[ResumeParser] ✅ Application {application_id} scored: {app.resume_score:.2f}")

    except Exception as e:
        print(f"[ResumeParser] ❌ Error processing application {application_id}: {e}")
        try:
            app = db.query(models.Application).filter(models.Application.id == application_id).first()
            if app:
                app.status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

# ── Mock fallbacks ────────────────────────────────────────────────────────────
def _mock_structured_fields() -> dict:
    import random
    return {
        "name": f"Candidate {random.randint(100, 999)}",
        "email": f"candidate{random.randint(10, 99)}@example.com",
        "phone": f"+1-555-{random.randint(1000, 9999)}",
        "skills": ["Python", "React", "SQL", "Git", "Docker"],
        "experience_years": random.randint(2, 10),
        "education": "Bachelor of Science in Computer Science",
        "current_role": "Software Engineer",
        "companies": ["TechCorp", "StartupXYZ"],
        "summary": "Experienced software engineer with strong technical background. Proficient in modern development practices."
    }

def _mock_score(criteria_config: list) -> dict:
    import random
    breakdown = []
    total = 0
    for c in criteria_config:
        name = c.get("name", str(c)) if isinstance(c, dict) else str(c)
        weight = c.get("weight", 0.25) if isinstance(c, dict) else 0.25
        score = random.randint(55, 92)
        total += score * weight
        breakdown.append({
            "criterion": name, "score": score, "weight": weight,
            "evidence": f"[Mock] Relevant experience found in resume for {name}",
            "verdict": "adequate"
        })
    final = min(total / 100, 1.0)
    return {
        "final_score": final,
        "breakdown": breakdown,
        "strengths": ["Technical proficiency", "Relevant experience"],
        "red_flags": [],
        "summary": "Candidate appears suitable based on provided resume information.",
        "recommendation": "advance" if final >= 0.65 else "hold"
    }
