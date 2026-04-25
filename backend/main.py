from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta
import jwt
from typing import Optional
import uuid

from database import engine, SessionLocal, Base
from models import User, UserProfile, Message
from schemas import UserCreate, UserLogin, UserProfileUpdate, MessageCreate
from gemini_service import analyze_behavior, get_ai_response

load_dotenv()

app = FastAPI(title="VibeCheck API")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_token(authorization: Optional[str] = Header(None), db = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def create_access_token(user_id: str):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

@app.post("/api/auth/register")
def register(user: UserCreate, db = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        id=str(uuid.uuid4()),
        email=user.email,
        first_name=user.firstName,
        password_hash=user.password,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    return {
        "token": token,
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "firstName": new_user.first_name
        }
    }

@app.post("/api/auth/login")
def login(user: UserLogin, db = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or db_user.password_hash != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(db_user.id)
    return {
        "token": token,
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "firstName": db_user.first_name
        }
    }

@app.get("/api/auth/me")
def get_current_user(current_user: User = Depends(verify_token)):
    profile = current_user.profile
    return {
        "user": {
            "uid": current_user.id,
            "email": current_user.email,
        },
        "profile": {
            "uid": current_user.id,
            "firstName": current_user.first_name,
            "age": profile.age if profile else None,
            "distance": profile.distance if profile else None,
            "onboardingComplete": profile.onboarding_complete if profile else False,
            "simulationComplete": profile.simulation_complete if profile else False,
            "matchFound": profile.match_found if profile else False,
            "vibeScore": profile.vibe_score if profile else None,
            "createdAt": current_user.created_at.isoformat() if current_user.created_at else None,
        }
    }

@app.post("/api/profile/onboarding")
def complete_onboarding(
    data: dict,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.age = data.get("age")
    profile.distance = data.get("distance")
    profile.interests = data.get("interests", [])
    profile.onboarding_complete = True

    db.commit()
    db.refresh(profile)

    return {"success": True, "profile": profile.__dict__}

@app.post("/api/messages/send")
def send_message(
    msg: MessageCreate,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    message = Message(
        user_id=current_user.id,
        sender_id=msg.senderId,
        text=msg.text,
        is_ai=msg.isAi,
        timestamp=datetime.utcnow()
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    if msg.isAi:
        return message.__dict__

    ai_response_text = get_ai_response(msg.text, current_user.first_name)
    ai_message = Message(
        user_id=current_user.id,
        sender_id="ai",
        text=ai_response_text,
        is_ai=True,
        timestamp=datetime.utcnow()
    )
    db.add(ai_message)
    db.commit()

    return {"success": True, "aiResponse": ai_response_text}

@app.get("/api/messages")
def get_messages(current_user: User = Depends(verify_token), db = Depends(get_db)):
    messages = db.query(Message).filter(Message.user_id == current_user.id).order_by(Message.timestamp).all()
    return [{"id": m.id, "senderId": m.sender_id, "text": m.text, "isAi": m.is_ai, "timestamp": m.timestamp.isoformat()} for m in messages]

@app.post("/api/simulation/complete")
def complete_simulation(
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile:
        messages = db.query(Message).filter(Message.user_id == current_user.id).all()
        vibe_score = analyze_behavior([m.text for m in messages if not m.is_ai])
        profile.simulation_complete = True
        profile.vibe_score = vibe_score
        db.commit()
        return {"success": True, "vibeScore": vibe_score}
    return {"success": False}

@app.post("/api/match/found")
def mark_match_found(
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile:
        profile.match_found = True
        profile.match_found_at = datetime.utcnow()
        db.commit()
        return {"success": True}
    return {"success": False}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# Serve static files (frontend build)
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    @app.get("/")
    def serve_index():
        return {"message": "VibeCheck API - Frontend not built yet"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
