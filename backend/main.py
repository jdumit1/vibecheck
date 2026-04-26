from fastapi import FastAPI, Depends, HTTPException, Header, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta
import jwt
from typing import Optional
from sqlalchemy import inspect, text
import shutil
import uuid

from database import engine, SessionLocal, Base
from models import User, UserProfile, Message
from schemas import UserCreate, UserLogin, UserProfileUpdate, MessageCreate, PhotoOrderUpdate, MatchCreate, MatchMessageCreate
from gemini_service import analyze_behavior, build_vibe_profile, get_ai_response

load_dotenv()

app = FastAPI(title="VibeCheck API")

Base.metadata.create_all(bind=engine)

UPLOAD_ROOT = Path(__file__).parent / "uploads"
PROFILE_UPLOAD_ROOT = UPLOAD_ROOT / "profiles"
PROFILE_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"


def ensure_profile_schema():
    inspector = inspect(engine)
    if "user_profiles" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    statements = []

    if "bio" not in existing_columns:
        statements.append("ALTER TABLE user_profiles ADD COLUMN bio TEXT")
    if "location" not in existing_columns:
        statements.append("ALTER TABLE user_profiles ADD COLUMN location VARCHAR")
    if "photos" not in existing_columns:
        statements.append("ALTER TABLE user_profiles ADD COLUMN photos JSON")
    if "matches" not in existing_columns:
        statements.append("ALTER TABLE user_profiles ADD COLUMN matches JSON")
    if "active_match_id" not in existing_columns:
        statements.append("ALTER TABLE user_profiles ADD COLUMN active_match_id VARCHAR")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


ensure_profile_schema()

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


def get_or_create_profile(db, user_id: str):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id, photos=[], matches=[])
        db.add(profile)
        db.flush()
    return profile


def sort_matches_by_recency(matches: list[dict]):
    def sort_key(match: dict):
        timestamp = match.get("lastMessageAt") or match.get("matchedAt") or ""
        return timestamp

    return sorted(list(matches or []), key=sort_key, reverse=True)


def serialize_profile(current_user: User, profile: Optional[UserProfile]):
    sorted_matches = sort_matches_by_recency(profile.matches if profile else [])
    return {
        "uid": current_user.id,
        "firstName": current_user.first_name,
        "age": profile.age if profile else None,
        "distance": profile.distance if profile else None,
        "bio": profile.bio if profile else None,
        "location": profile.location if profile else None,
        "interests": profile.interests if profile and profile.interests else [],
        "photos": profile.photos if profile and profile.photos else [],
        "matches": sorted_matches,
        "activeMatchId": profile.active_match_id if profile else None,
        "onboardingComplete": profile.onboarding_complete if profile else False,
        "simulationComplete": profile.simulation_complete if profile else False,
        "matchFound": profile.match_found if profile else False,
        "vibeScore": profile.vibe_score if profile else None,
        "createdAt": current_user.created_at.isoformat() if current_user.created_at else None,
    }


def build_profile_context(current_user: User, profile: Optional[UserProfile]):
    return {
        "firstName": current_user.first_name,
        "age": profile.age if profile else None,
        "bio": profile.bio if profile else None,
        "location": profile.location if profile else None,
        "interests": profile.interests if profile and profile.interests else [],
    }


def get_upload_path(photo_url: str):
    cleaned_path = photo_url.lstrip("/")
    return Path(__file__).parent / cleaned_path


def build_match_intro(match_data: dict):
    return {
        "id": str(uuid.uuid4()),
        "sender": "match",
        "text": f"Hey, it is {match_data['name']}. You swiped right, so I figured I should make this easy. What caught your eye?",
        "timestamp": datetime.utcnow().isoformat(),
    }


def build_match_reply(match_data: dict, user_text: str, message_count: int):
    lowered = user_text.lower()
    reply_options = [
        f"That is a strong opener. For context, my ideal first date is still: {match_data['prompt']}",
        f"You seem fun. I am usually pulled in by people who are into {', '.join(match_data['badges'][:2])} and can actually keep the banter going.",
        "Okay, I am into this. Tell me one thing about you that is not obvious from your profile.",
    ]

    if "date" in lowered or "drink" in lowered or "coffee" in lowered:
        text = f"Now we are talking. My move would be something close, easy, and a little specific. {match_data['prompt']}"
    elif "hi" in lowered or "hey" in lowered or "hello" in lowered:
        text = "Hi back. I was hoping you would actually say something. What is your version of a perfect low-key night?"
    else:
        text = reply_options[message_count % len(reply_options)]

    return {
        "id": str(uuid.uuid4()),
        "sender": "match",
        "text": text,
        "timestamp": datetime.utcnow().isoformat(),
    }


def build_match_nudge(match_data: dict, message_count: int):
    prompts = [
        f"Quick check: are you actually going to plan something, or are we keeping this at flirting about {match_data['badges'][0]}?",
        f"You disappeared for a second, so I am reclaiming the conversation. What would our first drink spot actually be?",
        f"I have decided you get one more chance to impress me. Start with the story behind your best bad decision.",
    ]
    text = prompts[message_count % len(prompts)]
    return {
        "id": str(uuid.uuid4()),
        "sender": "match",
        "text": text,
        "timestamp": datetime.utcnow().isoformat(),
    }


def find_match(profile: UserProfile, match_id: str):
    matches = list(profile.matches or [])
    for index, match in enumerate(matches):
        if match.get("id") == match_id:
            return matches, index, match
    return matches, -1, None


def pin_match_to_front(matches: list[dict], match_id: str, replacement: Optional[dict] = None):
    next_matches = list(matches)
    for index, match in enumerate(next_matches):
        if match.get("id") != match_id:
            continue

        updated_match = replacement or match
        del next_matches[index]
        next_matches.insert(0, updated_match)
        return next_matches

    if replacement:
        next_matches.insert(0, replacement)

    return next_matches


def get_latest_incoming_message(match: dict):
    for message in reversed(list(match.get("messages") or [])):
        if message.get("sender") == "match":
            return message
    return None

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
        "profile": serialize_profile(current_user, profile)
    }

@app.post("/api/profile/onboarding")
def complete_onboarding(
    data: UserProfileUpdate,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)

    payload = data.model_dump(exclude_unset=True)
    profile.age = payload.get("age")
    profile.distance = payload.get("distance")
    profile.bio = payload.get("bio")
    profile.location = payload.get("location")
    profile.interests = payload.get("interests", [])
    if "photos" in payload:
        profile.photos = payload.get("photos", [])[:6]
    profile.onboarding_complete = True

    db.commit()
    db.refresh(profile)

    return {"success": True, "profile": serialize_profile(current_user, profile)}


@app.post("/api/profile/photos")
def upload_profile_photos(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    profile = get_or_create_profile(db, current_user.id)
    existing_photos = list(profile.photos or [])
    available_slots = max(0, 6 - len(existing_photos))

    if available_slots == 0:
        raise HTTPException(status_code=400, detail="Profile already has 6 photos")

    uploaded_photo_urls = []
    user_upload_dir = PROFILE_UPLOAD_ROOT / current_user.id
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    for uploaded_file in files[:available_slots]:
        suffix = Path(uploaded_file.filename or "").suffix.lower()
        if uploaded_file.content_type and not uploaded_file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image uploads are supported")
        if suffix and suffix not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported image format")

        safe_suffix = suffix or ".jpg"
        filename = f"{uuid.uuid4().hex}{safe_suffix}"
        destination = user_upload_dir / filename

        with destination.open("wb") as output_file:
            shutil.copyfileobj(uploaded_file.file, output_file)

        uploaded_photo_urls.append(f"/uploads/profiles/{current_user.id}/{filename}")

    profile.photos = existing_photos + uploaded_photo_urls
    db.commit()
    db.refresh(profile)

    return {"success": True, "photos": profile.photos}


@app.put("/api/profile/photos")
def update_profile_photos(
    data: PhotoOrderUpdate,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    existing_photos = list(profile.photos or [])
    requested_photos = data.photos[:6]

    if any(photo not in existing_photos for photo in requested_photos):
        raise HTTPException(status_code=400, detail="Unknown photo in gallery update")

    removed_photos = set(existing_photos) - set(requested_photos)
    for removed_photo in removed_photos:
        file_path = get_upload_path(removed_photo)
        if file_path.exists():
            file_path.unlink()

    profile.photos = requested_photos
    db.commit()
    db.refresh(profile)

    return {"success": True, "photos": profile.photos}


@app.get("/api/matches")
def get_matches(
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    return {
        "matches": sort_matches_by_recency(profile.matches or []),
        "activeMatchId": profile.active_match_id,
    }


@app.post("/api/simulation/vibe-check")
def run_vibe_check(
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    profile_context = build_profile_context(current_user, profile)
    messages = db.query(Message).filter(Message.user_id == current_user.id, Message.is_ai == False).order_by(Message.timestamp).all()
    vibe_score = build_vibe_profile(profile_context, [message.text for message in messages])
    profile.vibe_score = vibe_score
    db.commit()
    db.refresh(profile)

    return {"success": True, "vibeScore": vibe_score}


@app.post("/api/matches")
def create_match(
    data: MatchCreate,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    matches, _, existing_match = find_match(profile, data.id)

    if existing_match:
        profile.active_match_id = existing_match["id"]
        existing_match["unreadCount"] = 0
        matches = pin_match_to_front(matches, existing_match["id"], existing_match)
        profile.matches = matches
        profile.match_found = True
        profile.match_found_at = profile.match_found_at or datetime.utcnow()
        db.commit()
        return {
            "success": True,
            "match": existing_match,
            "isNew": False,
            "activeMatchId": profile.active_match_id,
        }

    match_data = data.model_dump()
    timestamp = datetime.utcnow().isoformat()
    new_match = {
        **match_data,
        "matchedAt": timestamp,
        "lastMessage": f"You matched with {match_data['name']}",
        "lastMessageAt": timestamp,
        "unreadCount": 1,
        "lastSeenMessageId": None,
        "messages": [build_match_intro(match_data)],
    }
    matches.insert(0, new_match)
    profile.matches = matches
    profile.active_match_id = new_match["id"]
    profile.match_found = True
    profile.match_found_at = profile.match_found_at or datetime.utcnow()

    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "match": new_match,
        "isNew": True,
        "activeMatchId": profile.active_match_id,
    }


@app.post("/api/matches/{match_id}/activate")
def activate_match(
    match_id: str,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    matches, _, match = find_match(profile, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    updated_match = {
        **match,
    }
    matches = pin_match_to_front(matches, match_id, updated_match)
    profile.active_match_id = match_id
    profile.matches = matches
    db.commit()

    return {"success": True, "activeMatchId": profile.active_match_id}


@app.post("/api/matches/{match_id}/read")
def mark_match_read(
    match_id: str,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    matches, _, match = find_match(profile, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    latest_incoming_message = get_latest_incoming_message(match)
    if not latest_incoming_message:
        return {"success": True, "activeMatchId": profile.active_match_id}

    updated_match = {
        **match,
        "unreadCount": 0,
        "lastSeenMessageId": latest_incoming_message["id"],
    }
    profile.matches = pin_match_to_front(matches, match_id, updated_match)
    db.commit()

    return {
        "success": True,
        "match": updated_match,
        "activeMatchId": profile.active_match_id,
    }


@app.post("/api/matches/{match_id}/messages")
def send_match_message(
    match_id: str,
    data: MatchMessageCreate,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    matches, match_index, match = find_match(profile, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    user_message = {
        "id": str(uuid.uuid4()),
        "sender": "self",
        "text": data.text,
        "timestamp": datetime.utcnow().isoformat(),
    }
    next_messages = list(match.get("messages") or [])
    next_messages.append(user_message)
    next_messages.append(build_match_reply(match, data.text, len(next_messages)))
    latest_incoming_message = get_latest_incoming_message({**match, "messages": next_messages})

    updated_match = {
        **match,
        "messages": next_messages,
        "lastMessage": next_messages[-1]["text"],
        "lastMessageAt": next_messages[-1]["timestamp"],
        "unreadCount": 1 if profile.active_match_id != match_id else 0,
        "lastSeenMessageId": latest_incoming_message["id"] if profile.active_match_id == match_id and latest_incoming_message else match.get("lastSeenMessageId"),
    }
    profile.matches = pin_match_to_front(matches, match_id, updated_match)
    profile.active_match_id = match_id
    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "match": updated_match,
        "activeMatchId": profile.active_match_id,
    }


@app.post("/api/matches/{match_id}/simulate-reply")
def simulate_match_reply(
    match_id: str,
    current_user: User = Depends(verify_token),
    db = Depends(get_db)
):
    profile = get_or_create_profile(db, current_user.id)
    matches, _, match = find_match(profile, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    next_messages = list(match.get("messages") or [])
    simulated_reply = build_match_nudge(match, len(next_messages))
    next_messages.append(simulated_reply)

    current_unread = int(match.get("unreadCount") or 0)
    updated_match = {
        **match,
        "messages": next_messages,
        "lastMessage": simulated_reply["text"],
        "lastMessageAt": simulated_reply["timestamp"],
        "unreadCount": 0 if profile.active_match_id == match_id else current_unread + 1,
        "lastSeenMessageId": simulated_reply["id"] if profile.active_match_id == match_id else match.get("lastSeenMessageId"),
    }

    profile.matches = pin_match_to_front(matches, match_id, updated_match)
    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "match": updated_match,
        "activeMatchId": profile.active_match_id,
    }

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
        return {"id": message.id, "text": message.text, "isAi": True}

    history_msgs = db.query(Message).filter(
        Message.user_id == current_user.id,
        Message.id != message.id
    ).order_by(Message.timestamp).all()

    history = [
        {"text": m.text, "isAi": m.is_ai}
        for m in history_msgs
    ]

    ai_response_text = get_ai_response(msg.text, current_user.first_name, history)

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
        vibe_score = analyze_behavior(
            [m.text for m in messages if not m.is_ai],
            build_profile_context(current_user, profile),
        )
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

@app.get("/api/debug")
def debug_info():
    """Debug endpoint to inspect filesystem"""
    cwd = Path.cwd()
    script_dir = Path(__file__).parent
    static_dir = script_dir / "static"

    return {
        "cwd": str(cwd),
        "script_dir": str(script_dir),
        "static_dir": str(static_dir),
        "static_exists": static_dir.exists(),
        "cwd_contents": [str(p.name) for p in cwd.iterdir()] if cwd.exists() else [],
        "script_dir_contents": [str(p.name) for p in script_dir.iterdir()] if script_dir.exists() else [],
        "static_contents": [str(p.name) for p in static_dir.iterdir()] if static_dir.exists() else [],
    }

# Serve static files (frontend build)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    @app.get("/")
    def serve_index():
        return {
            "message": "VibeCheck API - Frontend not built yet",
            "debug_url": "/api/debug"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
