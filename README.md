# VibeCheck - AI-Powered Behavioral Matching

Find your vibe. For real.

## 🎯 Features

- **AI Assessment** - Gemini-powered behavioral analysis through natural conversation
- **Real Connections** - Match with users based on genuine behavioral compatibility
- **Behavioral Sync** - Deep conversation simulation to assess emotional intelligence
- **Serendipitous Match** - Radar animations and haptic feedback

## 🚀 Quick Start

### Backend (Python/FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Frontend (React)
```bash
npm install
npm run dev
```

## 📚 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind + Framer Motion
- **Backend**: FastAPI + SQLAlchemy + SQLite/PostgreSQL
- **AI**: Google Gemini API
- **Deployment**: Railway

## 🔗 Deployment

Push to Railway:
```bash
railway login
railway init
railway up
```

Set environment variables on Railway dashboard:
- `SECRET_KEY`
- `DATABASE_URL` (provided)
- `GEMINI_API_KEY`

## 📝 License

MIT
