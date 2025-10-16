#!/bin/bash

echo "================================"
echo " DeepSeek RAG Agent - Launcher"
echo "================================"
echo

# Start Backend
echo "[INFO] Starting backend..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

cd ..

# Wait a moment for backend to start
sleep 3

# Start Frontend
echo "[INFO] Starting frontend..."
cd frontend
npm start &
FRONTEND_PID=$!

cd ..

echo
echo "[INFO] Application is starting..."
echo "[INFO] Backend: http://localhost:8000"
echo "[INFO] Frontend: http://localhost:3000"
echo
echo "Press Ctrl+C to stop both services"

# Wait for user input
trap "echo; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
