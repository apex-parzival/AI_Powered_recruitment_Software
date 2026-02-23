from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Union
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class CriteriaVersionResponse(BaseModel):
    id: int
    job_id: int
    version: int
    criteria_config: Union[List[Any], Dict[str, Any], Any]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class JobCreate(BaseModel):
    title: str
    description: str
    department: str
    created_by: int

class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    department: str
    created_by: int
    created_at: datetime
    active_criteria: Optional[CriteriaVersionResponse] = None
    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    resume_score: Optional[float] = None
    breakdown: Optional[Any] = None
    score_breakdown: Optional[Any] = None
    resume_structured_data: Optional[Any] = None
    status: str
    recommendation_flag: bool
    class Config:
        from_attributes = True

class InterviewScorecardCreate(BaseModel):
    overall_score: float
    criterion_scores: Dict[str, Any]
    strengths: str
    weaknesses: str
    risk_flags: Optional[str] = None

class FinalEvaluationCreate(BaseModel):
    resume_score: float
    interview_score: float
    subjective_score: float
    final_score: float
    recommendation: str
    summary: str
