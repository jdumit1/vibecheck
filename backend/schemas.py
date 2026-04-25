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
    interests: Optional[List[str]] = None

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
    onboardingComplete: bool
    simulationComplete: bool
    matchFound: bool
    vibeScore: Optional[dict] = None
    createdAt: Optional[str] = None
