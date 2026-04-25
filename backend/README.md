# VibeCheck Backend (Python/FastAPI)

Python-based REST API backend for the VibeCheck application, replacing Firebase with a local database.

## Setup

### Prerequisites
- Python 3.9+
- pip

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY if you have one
```

5. Start the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile (requires token)

### Messages
- `POST /api/messages/send` - Send a message
- `GET /api/messages` - Get all messages for user

### Profile
- `POST /api/profile/onboarding` - Complete onboarding
- `POST /api/simulation/complete` - Mark simulation as complete
- `POST /api/match/found` - Mark match as found

## Architecture

- **Database**: SQLite (easily upgradable to PostgreSQL)
- **ORM**: SQLAlchemy
- **API**: FastAPI with async support
- **Auth**: JWT tokens
- **AI**: Google Gemini API (optional)

## Database Schema

### Users
- id, email, first_name, password_hash, created_at

### User Profiles
- id, user_id, age, distance, interests, onboarding_complete, simulation_complete, match_found, vibe_score

### Messages
- id, user_id, sender_id, text, is_ai, timestamp

## Scaling

To upgrade from SQLite to PostgreSQL:
1. Install: `pip install psycopg2-binary`
2. Update `.env`: `DATABASE_URL=postgresql://user:password@localhost/vibecheck`
3. Restart server

## Development

API docs available at: `http://localhost:8000/docs`
