from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    messages = relationship("Message", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    age = Column(Integer)
    distance = Column(Integer)
    bio = Column(Text)
    location = Column(String)
    interests = Column(JSON, default=[])
    photos = Column(JSON, default=[])
    matches = Column(JSON, default=[])
    active_match_id = Column(String)
    onboarding_complete = Column(Boolean, default=False)
    simulation_complete = Column(Boolean, default=False)
    match_found = Column(Boolean, default=False)
    vibe_score = Column(JSON)
    match_found_at = Column(DateTime)

    user = relationship("User", back_populates="profile")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    sender_id = Column(String)
    text = Column(Text)
    is_ai = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="messages")
