from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os, uuid, json, concurrent.futures
from dotenv import load_dotenv

load_dotenv()

import models, schemas
from database import engine, get_db
from ai_service import generate_job_criteria
import resume_parser
import interview_service

models.Base.metadata.create_all(bind=engine)

_thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=16)

app = FastAPI(title="TalentAI Recruitment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    gemini_status = "✅ Gemini Flash active" if resume_parser.GEMINI_AVAILABLE else "⚠️  Gemini not configured (set GEMINI_API_KEY in .env)"
    return {"message": "TalentAI Recruitment API", "gemini": gemini_status}

@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Live platform counts for Dashboard."""
    from sqlalchemy import func
    total_jobs = db.query(models.Job).count()
    total_candidates = db.query(models.Candidate).count()
    total_applications = db.query(models.Application).count()
    completed = db.query(models.Application).filter(models.Application.status == "completed").count()
    recommended = db.query(models.Application).filter(models.Application.recommendation_flag == True).count()
    sessions = db.query(models.InterviewSession).count()
    completed_sessions = db.query(models.InterviewSession).filter(models.InterviewSession.status == "completed").count()
    final_evals = db.query(models.FinalEvaluation).count()
    verdicts = db.query(models.FinalEvaluation.verdict, func.count()).group_by(models.FinalEvaluation.verdict).all()
    verdict_map = {v: c for v, c in verdicts}
    avg_score = db.query(func.avg(models.Application.resume_score)).filter(
        models.Application.resume_score != None
    ).scalar()
    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "total_applications": total_applications,
        "completed_applications": completed,
        "recommended": recommended,
        "total_interviews": sessions,
        "completed_interviews": completed_sessions,
        "final_evaluations": final_evals,
        "verdicts": verdict_map,
        "avg_resume_score": round(float(avg_score or 0) * 100, 1),
        "acceptance_rate": round(verdict_map.get("ACCEPT", 0) / max(final_evals, 1) * 100, 1),
    }


# ─────────────────────────────────────────────────────────────────────────────
# JOBS
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/jobs", response_model=schemas.JobResponse)
def create_job(job: schemas.JobCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == job.created_by).first()
    if not db_user:
        db_user = models.User(id=job.created_by, username="admin_stub", role="Admin")
        db.add(db_user)
        db.commit()
    db_job = models.Job(title=job.title, description=job.description,
                         department=job.department, created_by=job.created_by)
    db.add(db_job); db.commit(); db.refresh(db_job)
    return db_job

@app.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.Job).order_by(models.Job.created_at.desc()).all()
    result = []
    for job in jobs:
        crit = db.query(models.CriteriaVersion).filter(
            models.CriteriaVersion.job_id == job.id,
            models.CriteriaVersion.is_active == True
        ).first()
        app_count = db.query(models.Application).filter(models.Application.job_id == job.id).count()
        result.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "department": job.department,
            "created_by": job.created_by,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "application_count": app_count,
            "active_criteria": {
                "id": crit.id,
                "job_id": crit.job_id,
                "version": crit.version,
                "criteria_config": crit.criteria_config,
                "is_active": crit.is_active,
                "created_at": crit.created_at.isoformat() if crit.created_at else None,
            } if crit else None,
        })
    return result

@app.post("/jobs/{job_id}/criteria/generate", response_model=schemas.CriteriaVersionResponse)
def generate_criteria(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job: raise HTTPException(404, "Job not found")
    criteria_json = generate_job_criteria(job.title, job.description)
    db.query(models.CriteriaVersion).filter(models.CriteriaVersion.job_id == job_id).update({"is_active": False})
    last = db.query(models.CriteriaVersion).filter(models.CriteriaVersion.job_id == job_id).order_by(models.CriteriaVersion.version.desc()).first()
    ver = models.CriteriaVersion(job_id=job.id, version=(last.version+1 if last else 1),
                                  version_number=(last.version+1 if last else 1),
                                  criteria_config=criteria_json, is_active=True)
    db.add(ver); db.commit(); db.refresh(ver)
    return ver

# ─────────────────────────────────────────────────────────────────────────────
# BULK RESUME UPLOAD (1000+ support)
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/jobs/{job_id}/resumes/upload")
async def upload_resumes(job_id: int, background_tasks: BackgroundTasks,
                          db: Session = Depends(get_db),
                          files: List[UploadFile] = File(...)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job: raise HTTPException(404, "Job not found")

    BATCH = 50
    queued, count = [], 0

    for file in files:
        name = file.filename or ""
        if not name.lower().endswith(".pdf"): continue
        path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}_{name}")
        with open(path, "wb") as buf:
            while chunk := await file.read(65536):
                buf.write(chunk)

        cand = models.Candidate(name=name.replace(".pdf",""), resume_path=path)
        db.add(cand); db.flush()
        appl = models.Application(job_id=job.id, candidate_id=cand.id, status="queued")
        db.add(appl); db.flush()
        queued.append(appl.id); count += 1
        if count >= BATCH:
            db.commit(); count = 0

    if count > 0: db.commit()
    for aid in queued:
        background_tasks.add_task(resume_parser.process_resume_pipeline, aid)

    return {"queued_count": len(queued), "message": f"Queued {len(queued)} resumes for Gemini Flash analysis"}

@app.get("/jobs/{job_id}/applications", response_model=List[schemas.ApplicationResponse])
def get_applications(job_id: int, db: Session = Depends(get_db)):
    apps = db.query(models.Application).filter(
        models.Application.job_id == job_id
    ).order_by(models.Application.resume_score.desc()).all()
    for a in apps:
        if a.resume_score is None: a.resume_score = 0.0
        if a.recommendation_flag is None: a.recommendation_flag = False
    return apps

@app.get("/candidates")
def list_candidates(search: str = "", limit: int = 200, db: Session = Depends(get_db)):
    """All candidates enriched with their best application, score, and final verdict."""
    rows = db.query(models.Candidate).limit(limit).all()
    result = []
    for cand in rows:
        if search and search.lower() not in (cand.name or "").lower():
            continue
        # Best application by score
        best_app = db.query(models.Application).filter(
            models.Application.candidate_id == cand.id
        ).order_by(models.Application.resume_score.desc()).first()

        job = db.query(models.Job).filter(models.Job.id == best_app.job_id).first() if best_app else None

        # Interview session
        session = None
        int_score = None
        if best_app:
            session = db.query(models.InterviewSession).filter(
                models.InterviewSession.application_id == best_app.id
            ).order_by(models.InterviewSession.id.desc()).first()
            if session and session.scorecard:
                int_score = session.scorecard.overall_score

        # Final evaluation
        final = db.query(models.FinalEvaluation).filter(
            models.FinalEvaluation.application_id == (best_app.id if best_app else -1)
        ).first()

        sd = cand.structured_data or {}
        result.append({
            "id": cand.id,
            "name": cand.name or sd.get("name", f"Candidate {cand.id}"),
            "email": cand.email or sd.get("email", ""),
            "phone": cand.phone or sd.get("phone", ""),
            "skills": sd.get("skills", []),
            "experience_years": sd.get("experience_years", 0),
            "education": sd.get("education", ""),
            "current_role": sd.get("current_role", ""),
            "companies": sd.get("companies", []),
            "application_id": best_app.id if best_app else None,
            "job_id": best_app.job_id if best_app else None,
            "job_title": job.title if job else "",
            "resume_score": best_app.resume_score if best_app else None,
            "status": best_app.status if best_app else "none",
            "recommendation_flag": best_app.recommendation_flag if best_app else False,
            "interview_session_id": session.id if session else None,
            "interview_score": int_score,
            "final_verdict": final.verdict if final else None,
            "final_score": final.final_score if final else None,
            "score_breakdown": best_app.score_breakdown if best_app else None,
        })
    result.sort(key=lambda x: (x["resume_score"] or 0), reverse=True)
    return result


@app.get("/applications/{app_id}/details")
def get_application_details(app_id: int, db: Session = Depends(get_db)):
    """Full details including Gemini score breakdown and candidate structured data."""
    appl = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not appl: raise HTTPException(404, "Application not found")
    cand = db.query(models.Candidate).filter(models.Candidate.id == appl.candidate_id).first()
    return {
        "application": {
            "id": appl.id, "job_id": appl.job_id, "status": appl.status,
            "resume_score": appl.resume_score,
            "recommendation_flag": appl.recommendation_flag,
            "score_breakdown": appl.score_breakdown,
            "resume_structured_data": appl.resume_structured_data,
            "interview_evaluation": appl.interview_evaluation,
            "final_assessment": appl.final_assessment,
        },
        "candidate": {
            "id": cand.id if cand else None,
            "name": cand.name if cand else None,
            "email": cand.email if cand else None,
            "structured_data": cand.structured_data if cand else {},
        }
    }

# ─────────────────────────────────────────────────────────────────────────────
# INTERVIEW SESSION
# ─────────────────────────────────────────────────────────────────────────────
class StartInterviewRequest(BaseModel):
    application_id: int

@app.post("/interviews/start")
def start_interview(req: StartInterviewRequest, db: Session = Depends(get_db)):
    """Create a Jitsi Meet room and initialize the interview session."""
    appl = db.query(models.Application).filter(models.Application.id == req.application_id).first()
    if not appl: raise HTTPException(404, "Application not found")
    job = db.query(models.Job).filter(models.Job.id == appl.job_id).first()
    cand = db.query(models.Candidate).filter(models.Candidate.id == appl.candidate_id).first()

    meeting_info = interview_service.create_meeting_room(
        session_id=req.application_id,
        job_title=job.title if job else "",
        candidate_name=cand.name if cand else ""
    )

    session = models.InterviewSession(
        application_id=req.application_id,
        meet_link=meeting_info["meeting_url"],
        jitsi_room=meeting_info["room_name"],
        transcript_data=[],
        ai_suggestions=[],
        status="in_progress",
        started_at=datetime.utcnow()
    )
    db.add(session); db.commit(); db.refresh(session)

    return {
        "id": session.id,
        "application_id": req.application_id,
        "meet_link": meeting_info["meeting_url"],
        "jitsi_room": meeting_info["room_name"],
        "interviewer_url": f"/interview-room/{session.id}",
        "status": session.status
    }

@app.get("/interviews/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session: raise HTTPException(404, "Session not found")
    appl = db.query(models.Application).filter(models.Application.id == session.application_id).first()
    cand = db.query(models.Candidate).filter(models.Candidate.id == appl.candidate_id).first() if appl else None
    job = db.query(models.Job).filter(models.Job.id == appl.job_id).first() if appl else None
    structured = {}
    if appl and appl.resume_structured_data:
        try: structured = json.loads(appl.resume_structured_data) if isinstance(appl.resume_structured_data, str) else appl.resume_structured_data
        except: pass
    return {
        "id": session.id,
        "status": session.status,
        "meet_link": session.meet_link,
        "jitsi_room": session.jitsi_room,
        "transcript": session.transcript_data or [],
        "ai_suggestions": session.ai_suggestions or [],
        "candidate": {"name": cand.name if cand else "Candidate", "email": cand.email if cand else ""},
        "job_title": job.title if job else "Position",
        "resume_score": appl.resume_score if appl else None,
        "resume_structured_data": structured,
    }

class TranscriptChunkRequest(BaseModel):
    speaker: str       # "Interviewer" or "Candidate"
    text: str
    timestamp: Optional[str] = None

@app.post("/interviews/{session_id}/transcript")
def add_transcript_chunk(session_id: int, req: TranscriptChunkRequest, db: Session = Depends(get_db)):
    """Save a transcript segment and return updated AI follow-up questions."""
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session: raise HTTPException(404, "Session not found")

    chunk = {
        "speaker": req.speaker,
        "text": req.text,
        "timestamp": req.timestamp or datetime.utcnow().strftime("%H:%M:%S")
    }
    transcript = list(session.transcript_data or [])
    transcript.append(chunk)
    session.transcript_data = transcript

    # Generate AI follow-up questions every 3 chunks to avoid over-calling
    suggestions = list(session.ai_suggestions or [])
    if len(transcript) % 3 == 0:
        appl = db.query(models.Application).filter(models.Application.id == session.application_id).first()
        job = db.query(models.Job).filter(models.Job.id == appl.job_id).first() if appl else None
        criteria_ver = db.query(models.CriteriaVersion).filter(
            models.CriteriaVersion.job_id == (job.id if job else 0),
            models.CriteriaVersion.is_active == True
        ).first() if job else None
        criteria_list = []
        if criteria_ver:
            try: criteria_list = criteria_ver.criteria_config if isinstance(criteria_ver.criteria_config, list) else json.loads(criteria_ver.criteria_config)
            except: pass
        structured = {}
        if appl and appl.resume_structured_data:
            try: structured = appl.resume_structured_data if isinstance(appl.resume_structured_data, dict) else json.loads(appl.resume_structured_data)
            except: pass
        suggestions = interview_service.generate_followup_questions(
            transcript, criteria_list, structured, job.title if job else ""
        )
        session.ai_suggestions = suggestions

    db.commit()
    return {"added": chunk, "suggestions": suggestions, "transcript_length": len(transcript)}

@app.get("/interviews/{session_id}/suggestions")
def get_suggestions(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session: raise HTTPException(404)
    return {"suggestions": session.ai_suggestions or []}

@app.post("/interviews/{session_id}/end")
def end_interview(session_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """End the session and trigger post-interview Gemini evaluation in background."""
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session: raise HTTPException(404, "Session not found")
    session.status = "completed"
    session.ended_at = datetime.utcnow()
    db.commit()
    background_tasks.add_task(_run_interview_evaluation, session_id)
    return {"status": "completed", "redirect": f"/interview-report/{session_id}"}

def _run_interview_evaluation(session_id: int):
    """Background task: evaluate interview transcript vs resume using Gemini."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
        if not session: return
        appl = db.query(models.Application).filter(models.Application.id == session.application_id).first()
        if not appl: return
        cand = db.query(models.Candidate).filter(models.Candidate.id == appl.candidate_id).first()
        job = db.query(models.Job).filter(models.Job.id == appl.job_id).first()

        criteria_ver = db.query(models.CriteriaVersion).filter(
            models.CriteriaVersion.job_id == (job.id if job else 0),
            models.CriteriaVersion.is_active == True
        ).first()
        criteria_list = []
        if criteria_ver:
            try: criteria_list = criteria_ver.criteria_config if isinstance(criteria_ver.criteria_config, list) else json.loads(criteria_ver.criteria_config)
            except: pass

        resume_data = {}
        if appl.resume_structured_data:
            try: resume_data = appl.resume_structured_data if isinstance(appl.resume_structured_data, dict) else json.loads(appl.resume_structured_data)
            except: pass

        score_breakdown = {}
        if appl.score_breakdown:
            try: score_breakdown = appl.score_breakdown if isinstance(appl.score_breakdown, dict) else json.loads(appl.score_breakdown)
            except: pass

        evaluation = interview_service.evaluate_interview(
            full_transcript=session.transcript_data or [],
            resume_data=resume_data,
            score_breakdown=score_breakdown,
            job_criteria=criteria_list,
            job_title=job.title if job else ""
        )
        appl.interview_evaluation = evaluation
        # Save scorecard
        existing = db.query(models.InterviewScorecard).filter(models.InterviewScorecard.interview_session_id == session_id).first()
        if not existing:
            sc = models.InterviewScorecard(
                interview_session_id=session_id,
                overall_score=evaluation.get("interview_score", 0.7),
                criterion_scores=evaluation.get("criterion_scores", {}),
                strengths=", ".join(evaluation.get("strengths_demonstrated", [])),
                weaknesses=", ".join(evaluation.get("red_flags", [])),
                risk_flags=""
            )
            db.add(sc)
        db.commit()
        print(f"[InterviewEval] ✅ Session {session_id} evaluated. Score: {evaluation.get('interview_score', 0):.2f}")
    except Exception as e:
        print(f"[InterviewEval] ❌ Error: {e}")
    finally:
        db.close()

@app.get("/interviews/{session_id}/report")
def get_interview_report(session_id: int, db: Session = Depends(get_db)):
    """Full post-interview report: transcript + AI evaluation + resume data."""
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session: raise HTTPException(404)
    appl = db.query(models.Application).filter(models.Application.id == session.application_id).first()
    cand = db.query(models.Candidate).filter(models.Candidate.id == appl.candidate_id).first() if appl else None
    job = db.query(models.Job).filter(models.Job.id == appl.job_id).first() if appl else None

    interview_eval = {}
    if appl and appl.interview_evaluation:
        try: interview_eval = appl.interview_evaluation if isinstance(appl.interview_evaluation, dict) else json.loads(appl.interview_evaluation)
        except: pass

    resume_structured = {}
    if appl and appl.resume_structured_data:
        try: resume_structured = appl.resume_structured_data if isinstance(appl.resume_structured_data, dict) else json.loads(appl.resume_structured_data)
        except: pass

    score_breakdown = {}
    if appl and appl.score_breakdown:
        try: score_breakdown = appl.score_breakdown if isinstance(appl.score_breakdown, dict) else json.loads(appl.score_breakdown)
        except: pass

    return {
        "session_id": session_id,
        "application_id": session.application_id,
        "status": session.status,
        "transcript": session.transcript_data or [],
        "duration_minutes": (
            round((session.ended_at - session.started_at).total_seconds() / 60, 1)
            if session.ended_at and session.started_at else None
        ),
        "candidate": {"name": cand.name if cand else "Candidate", "email": cand.email if cand else ""},
        "job_title": job.title if job else "",
        "resume_score": appl.resume_score if appl else None,
        "resume_structured_data": resume_structured,
        "score_breakdown": score_breakdown,
        "interview_evaluation": interview_eval,
    }

# ─────────────────────────────────────────────────────────────────────────────
# FINAL ASSESSMENT  (ACCEPT / HOLD / REJECT)
# ─────────────────────────────────────────────────────────────────────────────
class FinalAssessmentRequest(BaseModel):
    application_id: int
    interviewer_rating: float   # 0.0-1.0 (Strong Hire=1.0, Hire=0.75, Neutral=0.5, No Hire=0.25)

@app.post("/assessments/final")
def create_final_assessment(req: FinalAssessmentRequest, db: Session = Depends(get_db)):
    appl = db.query(models.Application).filter(models.Application.id == req.application_id).first()
    if not appl: raise HTTPException(404, "Application not found")

    session = db.query(models.InterviewSession).filter(
        models.InterviewSession.application_id == req.application_id
    ).order_by(models.InterviewSession.id.desc()).first()

    interview_eval = {}
    if appl.interview_evaluation:
        try: interview_eval = appl.interview_evaluation if isinstance(appl.interview_evaluation, dict) else json.loads(appl.interview_evaluation)
        except: pass

    score_breakdown = {}
    if appl.score_breakdown:
        try: score_breakdown = appl.score_breakdown if isinstance(appl.score_breakdown, dict) else json.loads(appl.score_breakdown)
        except: pass

    cand = db.query(models.Candidate).filter(models.Candidate.id == appl.candidate_id).first()
    job = db.query(models.Job).filter(models.Job.id == appl.job_id).first()

    resume_score = float(appl.resume_score or 0.5)
    interview_score = float(interview_eval.get("interview_score", 0.0) or 0.0)
    if interview_score == 0.0:
        scorecard = db.query(models.InterviewScorecard).join(models.InterviewSession).filter(
            models.InterviewSession.application_id == req.application_id
        ).first()
        interview_score = float(scorecard.overall_score or 0.6) if scorecard else 0.6

    result = interview_service.final_assessment(
        resume_score=resume_score,
        interview_score=interview_score,
        interviewer_rating=req.interviewer_rating,
        score_breakdown=score_breakdown,
        interview_evaluation=interview_eval,
        candidate_name=cand.name if cand else "",
        job_title=job.title if job else ""
    )

    # Persist
    appl.final_assessment = result
    existing_eval = db.query(models.FinalEvaluation).filter(models.FinalEvaluation.application_id == req.application_id).first()
    if existing_eval:
        existing_eval.resume_score = resume_score
        existing_eval.interview_score = interview_score
        existing_eval.subjective_score = req.interviewer_rating
        existing_eval.final_score = result["final_score"]
        existing_eval.verdict = result["verdict"]
        existing_eval.recommendation = result["verdict"]
        existing_eval.summary = result.get("narrative", "")
        existing_eval.full_assessment = result
    else:
        db.add(models.FinalEvaluation(
            application_id=req.application_id,
            resume_score=resume_score,
            interview_score=interview_score,
            subjective_score=req.interviewer_rating,
            final_score=result["final_score"],
            verdict=result["verdict"],
            recommendation=result["verdict"],
            summary=result.get("narrative", ""),
            full_assessment=result
        ))
    db.commit()
    return result

# Legacy endpoint kept for backwards compat
class FinalEvalRequest(BaseModel):
    application_id: int
    interviewer_feedback_score: float
    resume_weight: float = 0.3
    interview_weight: float = 0.5
    feedback_weight: float = 0.2

@app.post("/evaluations/final")
def create_final_evaluation(req: FinalEvalRequest, db: Session = Depends(get_db)):
    return create_final_assessment(
        FinalAssessmentRequest(application_id=req.application_id, interviewer_rating=req.interviewer_feedback_score),
        db
    )

# Keep scorecard endpoint for compatibility
@app.post("/interviews/{session_id}/scorecard")
def generate_scorecard(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.InterviewSession).filter(models.InterviewSession.id == session_id).first()
    if not session: raise HTTPException(404)
    session.status = "completed"
    db.commit()
    return {"status": "completed", "session_id": session_id}
