import subprocess
import os
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("[*] Starting AI Recruitment MVP...")

    if not os.path.exists(os.path.join(backend_dir, "venv")):
        print("[-] Backend virtual environment not found. Please run 'python -m venv venv' inside backend folder and install requirements.")
        sys.exit(1)

    # Command to run backend
    # Uses the python executable from the virtual environment
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe") if os.name == 'nt' else os.path.join(backend_dir, "venv", "bin", "python")
    
    if not os.path.exists(venv_python):
        # Fallback to global python if someone installed dependencies globally
        venv_python = "python" 

    backend_cmd = [venv_python, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"]

    # Command to run frontend
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]

    print("[*] Launching Backend on port 8000")
    backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)

    print("[*] Launching Frontend via Vite")
    frontend_process = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n[*] Shutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
