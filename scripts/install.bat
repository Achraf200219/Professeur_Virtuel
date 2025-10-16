@echo off
echo ================================
echo  DeepSeek RAG Agent - Setup
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python n'est pas installe ou pas dans le PATH
    echo Installez Python 3.8+ depuis https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js n'est pas installe ou pas dans le PATH
    echo Installez Node.js 16+ depuis https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Python et Node.js detectes
echo.

REM Setup Backend
echo ================================
echo  Configuration du Backend
echo ================================
cd backend

echo [INFO] Creation de l'environnement virtuel...
python -m venv venv

echo [INFO] Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

echo [INFO] Installation des dependances Python...
pip install -r requirements.txt

cd ..

REM Setup Frontend
echo.
echo ================================
echo  Configuration du Frontend
echo ================================
cd frontend

echo [INFO] Installation des dependances Node.js...
npm install

cd ..

echo.
echo ================================
echo  Installation terminee !
echo ================================
echo.
echo Pour lancer l'application :
echo.
echo 1. Backend :
echo    cd backend
echo    venv\Scripts\activate
echo    python main.py
echo.
echo 2. Frontend (nouveau terminal) :
echo    cd frontend
echo    npm start
echo.
echo L'application sera disponible sur http://localhost:3000
echo.
pause
