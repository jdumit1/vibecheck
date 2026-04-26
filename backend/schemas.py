from pydantic import BaseModel
from typing import Optional, List

class UserCreate(BaseModel):
    email: str
    firstName: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    age: Optional[int] = None
    distance: Optional[int] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    interests: Optional[List[str]] = None
    photos: Optional[List[str]] = None

class PhotoOrderUpdate(BaseModel):
    photos: List[str]


class MatchCreate(BaseModel):
    id: str
    name: str
    age: int
    job: str
    distance: str
    bio: str
    badges: List[str]
    compatibility: int
    prompt: str
    photos: List[str]


class MatchMessageCreate(BaseModel):
    text: str

class MessageCreate(BaseModel):
    senderId: str
    text: str
    isAi: bool

class MessageResponse(BaseModel):
    id: int
    senderId: str
    text: str
    isAi: bool
    timestamp: str

class UserProfileResponse(BaseModel):
    uid: str
    firstName: str
    age: Optional[int] = None
    distance: Optional[int] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    interests: List[str] = []
    photos: List[str] = []
    matches: List[dict] = []
    activeMatchId: Optional[str] = None
    onboardingComplete: bool
    simulationComplete: bool
    matchFound: bool
    vibeScore: Optional[dict] = None
    createdAt: Optional[str] = None
