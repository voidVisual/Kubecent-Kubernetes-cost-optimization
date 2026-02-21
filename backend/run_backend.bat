@echo off
cd /d "c:\Users\omgho\OneDrive\Desktop\kubecent\backend"
"c:\Users\omgho\OneDrive\Desktop\kubecent\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
