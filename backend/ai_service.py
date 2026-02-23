import json
import requests
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
DEFAULT_MODEL = "llama3" # or mistral

def _call_ollama(prompt: str, model: str = DEFAULT_MODEL) -> str:
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json().get("response", "")
    except Exception as e:
        logger.error(f"Ollama call failed: {e}")
        return ""

def generate_job_criteria(job_title: str, job_description: str) -> Dict[str, Any]:
    """
    Uses LLM to extract structured evaluation criteria from a job description.
    Enforces that weights sum up to 1.0 (handled in prompt/post-process).
    """
    prompt = f"""
    You are an expert technical recruiter analyzing a job description.
    Job Title: {job_title}
    Job Description: {job_description}
    
    Extract the key skills and experience required. 
    Format the output EXACTLY as this JSON logic (do not add any markdown, just raw JSON):
    {{
        "skills": [
            {{"name": "Skill 1", "weight": 0.4, "threshold": 3}},
            {{"name": "Skill 2", "weight": 0.3, "threshold": 2}},
            {{"name": "Skill 3", "weight": 0.3, "threshold": 3}}
        ],
        "experience_years": 3,
        "education": "Relevant Degree"
    }}
    IMPORTANT: The sum of all skill weights MUST EXACTLY equal 1.0.
    """
    response_text = _call_ollama(prompt)
    if not response_text:
        # Fallback Mock if Ollama is not running
        return {
            "skills": [
                {"name": "Python", "weight": 0.5, "threshold": 3},
                {"name": "FastAPI", "weight": 0.3, "threshold": 2},
                {"name": "React", "weight": 0.2, "threshold": 2}
            ],
            "experience_years": 2,
            "education": "BS CS"
        }
    
    try:
        # Strip potential markdown blocks
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        criteria = json.loads(clean_json)
        
        # Normalize weights just to ensure total is 1.0
        if "skills" in criteria:
            total_weight = sum(skill.get("weight", 0) for skill in criteria["skills"])
            if total_weight > 0:
                for skill in criteria["skills"]:
                    skill["weight"] = round(skill.get("weight", 0) / total_weight, 2)
                    
        return criteria
    except Exception as e:
        logger.error(f"Failed to parse LLM json response: {e}, using fallback.")
        return {
            "skills": [
                {"name": "Communication", "weight": 0.5, "threshold": 3},
                {"name": "Problem Solving", "weight": 0.5, "threshold": 3}
            ],
            "experience_years": 1,
            "education": "Any"
        }
