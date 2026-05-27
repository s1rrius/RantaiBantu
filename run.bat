@echo off
SETLOCAL EnableDelayedExpansion

echo ====================================================
echo   🛡️  RantaiBantu Launcher - Starting Services
echo ====================================================

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b
)

:: Check for Venv
if not exist "backend\venv\" (
    echo [SETUP] Virtual environment not found in 'backend\venv'.
    echo [SETUP] Creating virtual environment...
    python -m venv backend\venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
    echo [SETUP] Installing backend dependencies...
    backend\venv\Scripts\python -m pip install -r backend\requirements.txt
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b
    )
    echo [SETUP] Environment ready!
)

:: Start Backend in a new window
echo [1/3] Launching Backend (FastAPI on port 8000)...
start "RantaiBantu-Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Start Frontend in a new window
echo [2/3] Launching Frontend (Flask on port 5000)...
start "RantaiBantu-Frontend" cmd /k "cd frontend && ..\backend\venv\Scripts\python serve_frontend.py"

:: Wait for servers to spin up
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

:: Open the application
echo Opening browser...
start http://127.0.0.1:5000

echo.
echo ====================================================
echo   ✅  Services are running!
echo.
echo   Frontend: http://127.0.0.1:5000
echo   API Docs: http://127.0.0.1:8000/docs
echo ====================================================
echo Press any key to exit this launcher (servers will stay open).
pause >nul
