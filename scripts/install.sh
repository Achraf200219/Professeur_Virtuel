#!/bin/bash

echo "================================"
echo " DeepSeek RAG Agent - Setup"
echo "================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 is not installed or not in PATH"
    echo "Install Python 3.8+ from https://python.org"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH"
    echo "Install Node.js 16+ from https://nodejs.org"
    exit 1
fi

echo "[INFO] Python and Node.js detected"
echo

# Setup Backend
echo "================================"
echo " Backend Setup"
echo "================================"
cd backend

echo "[INFO] Creating virtual environment..."
python3 -m venv venv

echo "[INFO] Activating virtual environment..."
source venv/bin/activate

echo "[INFO] Installing Python dependencies..."
pip install -r requirements.txt

cd ..

# Setup Frontend
echo
echo "================================"
echo " Frontend Setup"
echo "================================"
cd frontend

echo "[INFO] Installing Node.js dependencies..."
npm install

cd ..

echo
echo "================================"
echo " Installation Complete!"
echo "================================"
echo
echo "To run the application:"
echo
echo "1. Backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python main.py"
echo
echo "2. Frontend (new terminal):"
echo "   cd frontend"
echo "   npm start"
echo
echo "The application will be available at http://localhost:3000"
echo
