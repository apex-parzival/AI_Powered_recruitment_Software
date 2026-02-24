# Start TalentAI Backend
# Run this from the web/ directory
Write-Host "Starting TalentAI Backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
