from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, JSON, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(String)  # Admin, Recruiter, HiringManager

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    department = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    criteria_versions = relationship("CriteriaVersion", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")

class CriteriaVersion(Base):
    __tablename__ = "criteria_versions"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    version = Column(Integer, default=1)
    version_number = Column(Integer, default=1)
    criteria_config = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    job = relationship("Job", back_populates="criteria_versions")

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    resume_path = Column(String)
    parsed_text = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True)  # Gemini-extracted fields
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    resume_score = Column(Float, nullable=True)
    breakdown = Column(JSON, nullable=True)
    # NEW: Gemini-powered structured data
    resume_structured_data = Column(JSON, nullable=True)   # extracted fields
    score_breakdown = Column(JSON, nullable=True)           # per-criterion scoring
    interview_evaluation = Column(JSON, nullable=True)      # post-interview AI eval
    final_assessment = Column(JSON, nullable=True)          # ACCEPT/HOLD/REJECT result
    status = Column(String, default="queued")
    recommendation_flag = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")
    interview_sessions = relationship("InterviewSession", back_populates="application")
    final_evaluation = relationship("FinalEvaluation", uselist=False, back_populates="application")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    meet_link = Column(String, nullable=True)
    jitsi_room = Column(String, nullable=True)
    transcript_data = Column(JSON, nullable=True)  # list of {speaker, text, timestamp}
    ai_suggestions = Column(JSON, nullable=True)   # latest follow-up questions
    status = Column(String, default="scheduled")   # scheduled, in_progress, completed
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="interview_sessions")
    scorecard = relationship("InterviewScorecard", uselist=False, back_populates="session", cascade="all, delete-orphan")

class InterviewScorecard(Base):
    __tablename__ = "interview_scorecards"
    id = Column(Integer, primary_key=True, index=True)
    interview_session_id = Column(Integer, ForeignKey("interview_sessions.id"))
    overall_score = Column(Float, nullable=True)
    criterion_scores = Column(JSON, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    risk_flags = Column(Text, nullable=True)
    session = relationship("InterviewSession", back_populates="scorecard")

class FinalEvaluation(Base):
    __tablename__ = "final_evaluations"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    resume_score = Column(Float)
    interview_score = Column(Float)
    technical_score = Column(Float, nullable=True)   # NEW: from TechnicalAssessment
    subjective_score = Column(Float)
    final_score = Column(Float)
    verdict = Column(String, nullable=True)           # ACCEPT / HOLD / REJECT
    recommendation = Column(String)
    summary = Column(Text)
    full_assessment = Column(JSON, nullable=True)     # full Gemini assessment dict
    application = relationship("Application", back_populates="final_evaluation")


class TechnicalAssessment(Base):
    """AI-generated technical quiz sent to candidate before/during interview."""
    __tablename__ = "technical_assessments"
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    questions = Column(JSON)            # list of {question, expected_answer, criterion, difficulty}
    answers = Column(JSON, nullable=True)            # list of {question_id, answer_text}
    scores = Column(JSON, nullable=True)             # list of {question_id, score 0-10, feedback}
    overall_score = Column(Float, nullable=True)     # 0.0 – 1.0
    status = Column(String, default="pending")       # pending | submitted | scored
    token = Column(String, unique=True, index=True)  # shareable link token
    created_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

