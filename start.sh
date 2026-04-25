#!/bin/bash

echo "🚀 Starting VibeCheck..."

# Start backend
echo "📦 Starting Python backend..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "⚛️  Starting React frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Both services started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop"

wait
