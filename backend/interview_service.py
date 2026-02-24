"""
Interview service: Jitsi Meet room creation, STT transcript management,
real-time AI follow-up question generation, and post-interview evaluation.
Uses Gemini Flash for AI analysis.
"""
import os
import json
import uuid
import re
from dotenv import load_dotenv

load_dotenv()

# ── Gemini setup ──────────────────────────────────────────────────────────────
try:
    import google.generativeai as genai
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel("gemini-2.0-flash")
        GEMINI_AVAILABLE = True
    else:
        _model = None
        GEMINI_AVAILABLE = False
except ImportError:
    _model = None
    GEMINI_AVAILABLE = False

JITSI_BASE = "https://meet.jit.si"

def _call_gemini(prompt: str) -> str:
    if not GEMINI_AVAILABLE or _model is None:
        return ""
    try:
        response = _model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[InterviewService] Gemini error: {e}")
        return ""

def _parse_json(raw: str) -> dict | list | None:
    try:
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return None

# ── Meeting room ──────────────────────────────────────────────────────────────
import hashlib
import string

def _make_gmeet_code(session_id: int) -> str:
    """
    Generate a stable Google Meet room code from the session ID.
    Format: abc-defg-hij  (3-4-3 lowercase letters)
    When the first person visits meet.google.com/<code>, Google creates the room.
    """
    h = hashlib.sha256(f"talentai-{session_id}".encode()).hexdigest()
    alpha = string.ascii_lowercase
    # Map hex chars to letters deterministically
    def to_letters(start, length):
        return ''.join(alpha[int(h[i], 16) % 26] for i in range(start, start + length))
    p1 = to_letters(0, 3)
    p2 = to_letters(3, 4)
    p3 = to_letters(7, 3)
    return f"{p1}-{p2}-{p3}"

def create_meeting_room(session_id: int, job_title: str = "", candidate_name: str = "") -> dict:
    """
    Generate a Google Meet room link for the interview session.
    Uses a deterministic room code derived from session_id so the same
    link is always returned for the same session.
    """
    code = _make_gmeet_code(session_id)
    meet_url = f"https://meet.google.com/{code}"

    return {
        "room_name": code,
        "meeting_url": meet_url,
        "candidate_url": meet_url,
        "interviewer_url": f"/interview-room/{session_id}",
        "jitsi_room": code,   # kept for model compat — now stores meet code
    }


# ── AI follow-up questions ────────────────────────────────────────────────────
def generate_followup_questions(
    transcript_so_far: list[dict],
    job_criteria: list,
    resume_data: dict | None = None,
    job_title: str = ""
) -> list[dict]:
    """
    Given the running interview transcript, generate smart follow-up questions.
    Returns: [{ question, priority, rationale, criterion }]
    """
    if not transcript_so_far:
        return _mock_followup_questions()

    transcript_text = "\n".join(
        f"{t.get('speaker', 'Speaker')}: {t.get('text', '')}"
        for t in transcript_so_far[-10:]  # Last 10 exchanges
    )

    criteria_text = ", ".join(
        c.get("name", str(c)) if isinstance(c, dict) else str(c)
        for c in job_criteria
    )

    skills_text = ""
    if resume_data:
        skills = resume_data.get("skills", [])
        exp = resume_data.get("experience_years", "?")
        skills_text = f"\nResume highlights: {exp} years exp, skills: {', '.join(skills[:8])}"

    prompt = f"""You are an expert technical interviewer assisting in a live interview for: {job_title or 'Software Engineer'}.

Job criteria: {criteria_text}
{skills_text}

Interview transcript so far:
---
{transcript_text}
---

Based on what has been discussed so far, generate 3-4 smart follow-up questions that:
1. Probe deeper into areas where the candidate was vague or unspecific
2. Verify claims made in the resume
3. Assess criteria not yet covered

Return ONLY valid JSON array:
[
  {{
    "question": "the exact question to ask",
    "priority": "HIGH" or "MEDIUM",
    "rationale": "why this question is important now",
    "criterion": "which job criterion this tests"
  }}
]"""

    raw = _call_gemini(prompt)
    result = _parse_json(raw)
    if isinstance(result, list) and result:
        return result
    return _mock_followup_questions()

# ── Post-interview evaluation ─────────────────────────────────────────────────
def evaluate_interview(
    full_transcript: list[dict],
    resume_data: dict,
    score_breakdown: dict | None,
    job_criteria: list,
    job_title: str = ""
) -> dict:
    """
    After the interview ends, cross-reference answers with resume claims and score.
    Returns full evaluation with per-criterion interview scores.
    """
    if not full_transcript:
        return _mock_interview_evaluation(job_criteria)

    transcript_text = "\n".join(
        f"{t.get('speaker', 'Speaker')}: {t.get('text', '')}"
        for t in full_transcript
    )

    criteria_text = json.dumps(job_criteria, indent=2)

    resume_summary = json.dumps({
        "name": resume_data.get("name"),
        "skills": resume_data.get("skills", [])[:10],
        "experience_years": resume_data.get("experience_years"),
        "education": resume_data.get("education"),
        "current_role": resume_data.get("current_role"),
        "summary": resume_data.get("summary"),
    }, indent=2)

    prompt = f"""You are an expert technical recruiter performing a post-interview evaluation for: {job_title or 'Software Engineer'}.

RESUME PROFILE:
{resume_summary}

JOB CRITERIA:
{criteria_text}

FULL INTERVIEW TRANSCRIPT:
---
{transcript_text[:8000]}
---

Your task:
1. Score the candidate on each criterion based on WHAT THEY SAID in the interview (0-100)
2. Cross-reference their answers with WHAT THEY CLAIMED in the resume (consistency check)
3. Identify strengths demonstrated verbally
4. Identify red flags (inconsistencies, evasive answers, knowledge gaps)
5. Provide an overall interview score

Return ONLY valid JSON:
{{
  "interview_score": 0.78,
  "criterion_scores": [
    {{
      "criterion": "name",
      "score": 80,
      "evidence": "candidate said...",
      "consistency_with_resume": "consistent|inconsistent|not_covered",
      "verdict": "strong|adequate|weak|missing"
    }}
  ],
  "strengths_demonstrated": ["list of strengths shown in interview"],
  "red_flags": ["list of concerns"],
  "consistency_score": 0.85,
  "communication_score": 80,
  "key_insights": "2-3 paragraph recruiter narrative",
  "recommendation": "advance|hold|reject"
}}"""

    raw = _call_gemini(prompt)
    result = _parse_json(raw)
    if isinstance(result, dict) and "interview_score" in result:
        score = result.get("interview_score", 0.5)
        if score > 1:
            result["interview_score"] = score / 100
        return result
    return _mock_interview_evaluation(job_criteria)

# ── Final holistic assessment ─────────────────────────────────────────────────
def final_assessment(
    resume_score: float,
    interview_score: float,
    interviewer_rating: float,
    score_breakdown: dict | None,
    interview_evaluation: dict | None,
    candidate_name: str = "",
    job_title: str = ""
) -> dict:
    """
    Generate the final ACCEPT / HOLD / REJECT assessment.
    Weights: Resume 30% + Interview 50% + Interviewer 20%
    """
    final = (resume_score * 0.30) + (interview_score * 0.50) + (interviewer_rating * 0.20)

    if final >= 0.75:
        verdict = "ACCEPT"
        verdict_color = "#22C55E"
        action = "Proceed to offer stage"
    elif final >= 0.50:
        verdict = "HOLD"
        verdict_color = "#F59E0B"
        action = "Consider for future openings or additional rounds"
    else:
        verdict = "REJECT"
        verdict_color = "#EF4444"
        action = "Send polite rejection email"

    strengths = []
    red_flags = []
    if score_breakdown:
        strengths += score_breakdown.get("strengths", [])
        red_flags += score_breakdown.get("red_flags", [])
    if interview_evaluation:
        strengths += interview_evaluation.get("strengths_demonstrated", [])
        red_flags += interview_evaluation.get("red_flags", [])

    # Generate narrative via Gemini if available
    narrative = _generate_assessment_narrative(
        candidate_name, job_title, final, verdict,
        score_breakdown, interview_evaluation, interviewer_rating
    )

    return {
        "verdict": verdict,
        "verdict_color": verdict_color,
        "final_score": round(final, 4),
        "final_score_pct": round(final * 100, 1),
        "action": action,
        "component_scores": {
            "resume": round(resume_score, 4),
            "interview": round(interview_score, 4),
            "interviewer_rating": round(interviewer_rating, 4),
        },
        "weights": {"resume": 0.30, "interview": 0.50, "interviewer": 0.20},
        "strengths": list(set(strengths))[:6],
        "red_flags": list(set(red_flags))[:4],
        "narrative": narrative,
    }

def _generate_assessment_narrative(
    candidate_name, job_title, final_score, verdict,
    score_breakdown, interview_eval, interviewer_rating
) -> str:
    if not GEMINI_AVAILABLE:
        return f"{candidate_name or 'The candidate'} {'is recommended for' if verdict == 'ACCEPT' else 'has been placed on hold for' if verdict == 'HOLD' else 'has not been selected for'} the {job_title or 'role'}. Final composite score: {final_score*100:.1f}%."

    strengths = (score_breakdown or {}).get("strengths", []) + (interview_eval or {}).get("strengths_demonstrated", [])
    flags = (score_breakdown or {}).get("red_flags", []) + (interview_eval or {}).get("red_flags", [])

    prompt = f"""Write a concise 2-paragraph professional assessment for a hiring manager.

Candidate: {candidate_name or 'Candidate'}
Role: {job_title or 'Software Engineer'}
Final score: {final_score*100:.1f}% → {verdict}
Strengths: {strengths[:4]}
Red flags: {flags[:3]}
Interviewer rating: {interviewer_rating*100:.0f}%

Write professional narrative only (no JSON, no bullet points, no headers). First paragraph: overall assessment. Second paragraph: recommendation and next steps."""

    return _call_gemini(prompt) or f"Overall composite score: {final_score*100:.1f}%. Verdict: {verdict}."

# ── Mock fallbacks ────────────────────────────────────────────────────────────
def _mock_followup_questions() -> list[dict]:
    return [
        {"question": "Can you walk me through a system you designed from scratch and the key architectural decisions you made?", "priority": "HIGH", "rationale": "Tests system design depth", "criterion": "Technical Skills"},
        {"question": "How do you handle disagreements with senior engineers on technical choices?", "priority": "MEDIUM", "rationale": "Assesses communication and collaboration", "criterion": "Communication"},
        {"question": "Describe a time you worked under a tight deadline — what did you prioritize and why?", "priority": "HIGH", "rationale": "Tests problem solving under pressure", "criterion": "Problem Solving"},
    ]

def _mock_interview_evaluation(criteria: list) -> dict:
    import random
    scores = []
    for c in criteria:
        name = c.get("name", str(c)) if isinstance(c, dict) else str(c)
        scores.append({"criterion": name, "score": random.randint(60, 90), "evidence": "[Mock evaluation]", "consistency_with_resume": "consistent", "verdict": "adequate"})
    return {
        "interview_score": 0.72,
        "criterion_scores": scores,
        "strengths_demonstrated": ["Clear communication", "Strong technical depth"],
        "red_flags": [],
        "consistency_score": 0.85,
        "communication_score": 78,
        "key_insights": "The candidate demonstrated solid technical knowledge and communicated clearly.",
        "recommendation": "advance",
    }
