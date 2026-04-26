# VibeCheck

VibeCheck is an AI-assisted dating app prototype focused on behavioral matching rather than pure swipe velocity.

The current build combines a Tinder/Bumble-style discover flow with a Gemini-powered vibe check, a simulated conversation stage, persistent match threads, photo galleries, and a Google-oriented Demo Day presentation deck.

## What Shipped

- Photo-first onboarding with bio, location, interests, and gallery upload support
- Gemini-powered vibe profiling before matching
- AI chat simulation to infer conversational style and relationship intent
- Personalized discover deck ranking based on vibe traits
- True match creation on right swipe, with persistent chat threads
- Inbox behavior including unread counts, timestamps, recency sorting, and read markers
- Match reply simulation for inactive threads
- Demo Day presentation deck and exported PDF in `docs/`

## Google Products

### Live Today

- Google Gemini API powers conversation responses and vibe analysis
- `gemini-3.1-flash` is the default backend model

### Scaffolded In The Repo

- Firebase packages are installed in the frontend
- Firebase config files are present for a Google-native expansion path

Important: Firebase is not the core runtime for the current local app. Gemini is.

## Architecture

### Frontend

- React 19
- TypeScript
- Vite 6
- `motion` for UI animation
- `lucide-react` for icons

### Backend

- FastAPI
- SQLAlchemy
- SQLite in local development
- Railway deployment path for hosted environments

### AI Layer

- `google-generativeai` in the backend
- vibe profiling, simulation replies, and behavioral summaries driven by Gemini

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Gemini API key

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Create the backend virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Add environment variables

Create `backend/.env` with at least:

```bash
SECRET_KEY=change-me
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash
```

Optional:

```bash
DATABASE_URL=sqlite:///./vibecheck.db
```

### 4. Run the backend

Use the backend virtual environment. The system Python on this machine will fail because it does not have the required packages installed.

```bash
cd backend
source venv/bin/activate
python main.py
```

The API runs on `http://localhost:8000`.

### 5. Run the frontend

In a separate terminal:

```bash
npm run dev
```

The frontend is configured for port `3000`. If that port is already occupied, Vite may fall back to `3001`.

## Validation

Frontend checks:

```bash
npm run lint
npm run build
```

Backend syntax check:

```bash
cd backend
source venv/bin/activate
python -m py_compile main.py gemini_service.py models.py schemas.py
```

## Deployment

Railway is the current deployment target.

```bash
railway login
railway init
railway up
```

Required environment variables:

- `SECRET_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` if you want to override the default
- `DATABASE_URL` for hosted Postgres deployments

Full deployment notes are in `DEPLOYMENT.md`.

## Demo Materials

- HTML deck: `docs/vibecheck-google-presentation.html`
- PDF deck: `docs/awooga-vibecheck-demo-day.pdf`

## Repo Notes

- If a route looks missing locally, make sure an old Python process is not still bound to port `8000`
- Match state is currently persisted on the profile record for rapid prototyping
- The README intentionally separates live Google integrations from scaffolded ones to keep the product story accurate
