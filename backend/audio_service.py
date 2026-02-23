import random
import logging
from typing import Dict, Any, List
from ai_service import _call_ollama

logger = logging.getLogger(__name__)

MOCK_TRANSCRIPTS = [
    "Could you tell me about your experience with Python?",
    "I have been using Python for 4 years, mostly with FastAPI and Pandas.",
    "That sounds great. Have you deployed any of these to production?",
    "Yes, we used Docker and AWS ECS for deployment.",
    "What was the most challenging bug you faced?",
    "We had a memory leak in a background worker that took a while to track down using memory profilers."
]

def mock_process_audio_chunk(session_id: int, chunk_index: int) -> dict:
    """
    Mocks STT taking an audio chunk and returning diarized text.
    Alternates speaker to simulate Conversation.
    """
    speaker = "Interviewer" if chunk_index % 2 == 0 else "Candidate"
    # Safely get a mock transcript or a generic placeholder
    text = MOCK_TRANSCRIPTS[chunk_index % len(MOCK_TRANSCRIPTS)]
    
    return {
        "speaker": speaker,
        "text": text,
        "timestamp": f"00:0{chunk_index}:00" # Fake timestamp
    }

def get_live_ai_suggestions(transcript_history: List[dict], criteria: dict) -> dict:
    """
    Takes the recent transcript and job criteria to suggest follow-up questions or gaps to probe.
    """
    if len(transcript_history) < 2:
        return {"suggestions": ["Ask the candidate to introduce themselves.", "Review the resume highlights together."]}
        
    recent_chat = "\n".join([f"{t['speaker']}: {t['text']}" for t in transcript_history[-4:]])
    
    prompt = f"""
    You are an AI assistant helping an interviewer in real-time.
    
    Recent Conversation:
    {recent_chat}
    
    Based on this, suggest 2 brief, probing follow-up questions to ask the candidate to dig deeper into their skills.
    Return ONLY a JSON list of strings, e.g. ["Question 1", "Question 2"]
    """
    
    response = _call_ollama(prompt)
    
    if not response:
        return {"suggestions": ["Ask about testing strategies.", "Could they elaborate on their system design approach?"]}
        
    try:
        import json
        clean = response.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        if isinstance(data, list):
            return {"suggestions": data}
        return {"suggestions": ["Ask for a concrete example."]}
    except:
        return {"suggestions": ["Ask for a concrete example.", "What would they do differently?"]}
