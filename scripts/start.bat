@echo off
echo ================================
echo  DeepSeek RAG Agent - Launcher
echo ================================
echo.

REM Start Backend
echo [INFO] Demarrage du backend...
start cmd /k "cd backend && venv\Scripts\activate && python main.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [INFO] Demarrage du frontend...
start cmd /k "cd frontend && npm start"

echo.
echo [INFO] L'application se lance...
echo [INFO] Backend: http://localhost:8000
echo [INFO] Frontend: http://localhost:3000
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
