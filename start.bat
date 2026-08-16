@echo off
echo ============================================
echo   Interview Acer - Starting servers...
echo ============================================
echo.

echo Starting Backend (FastAPI)...
if exist ".venv\Scripts\activate" (
  start cmd /k "cd backend && ..\.venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"
) else if exist "venv\Scripts\activate" (
  start cmd /k "cd backend && ..\venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"
) else (
  echo WARNING: No virtual environment found. Starting without venv...
  start cmd /k "cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"
)

timeout /t 2 /nobreak >nul

echo Starting Frontend (Vite)...
start cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in new windows!
echo   Backend:  http://127.0.0.1:8001
echo   Frontend: http://localhost:5173
echo.
