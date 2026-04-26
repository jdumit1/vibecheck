import google.generativeai as genai
import os
import json
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini configured successfully")
else:
    logger.warning("GEMINI_API_KEY not set - AI responses will be fallbacks")

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.1-flash")

ALEX_PERSONA = """You are Alex, a 26-year-old engaging in a casual dating chat.

PERSONALITY:
- Warm, authentic, slightly witty
- Genuinely curious about the other person
- Shares your own thoughts/experiences (don't just ask questions)
- Has interests: coffee, indie films, weekend hiking, reading sci-fi
- Lives in the city, works in design

CONVERSATION STYLE:
- 1-2 sentences per reply, max 3
- Natural, conversational tone like texting a friend
- Mix of asking back AND sharing yourself
- React to what they actually said, don't be generic
- Use casual language, contractions, occasional humor
- NEVER say "That's interesting! Tell me more" - that's lazy

CRITICAL RULES:
- Do not break character or mention you are an AI
- Do not start every message with "I'm Alex"
- Read the user's message carefully and respond to its specific content
- If they're brief or seem distracted, acknowledge it gently"""


def _heuristic_vibe_profile(profile_context: Optional[dict] = None, messages: Optional[list] = None) -> dict:
    profile_context = profile_context or {}
    messages = messages or []

    interests = [str(interest).lower() for interest in profile_context.get("interests", [])]
    bio = str(profile_context.get("bio") or "").lower()
    location = str(profile_context.get("location") or "").lower()
    text_blob = " ".join(interests + [bio, location] + [str(message).lower() for message in messages])

    category = {
        "style": "Curious",
        "eq": 7,
        "summary": "You read like someone who wants chemistry with actual substance, not just quick swipes.",
        "subcategory": "Grounded romantic",
        "lookingFor": "steady chemistry with someone emotionally available",
        "preferredBadges": ["Coffee walks", "Sunday gallery", "Soft launch"],
        "preferredTraits": ["warm", "thoughtful", "intentional"],
    }

    if any(keyword in text_blob for keyword in ["design", "gallery", "art", "film", "ceramic", "book", "sci-fi", "museum"]):
        category = {
            "style": "Curious",
            "eq": 8,
            "summary": "You seem drawn to people with taste, specificity, and enough depth to make a quiet plan feel memorable.",
            "subcategory": "Creative romantic",
            "lookingFor": "creative chemistry with someone visually sharp and emotionally fluent",
            "preferredBadges": ["Design eye", "Sunday gallery", "Natural wine", "Soft launch"],
            "preferredTraits": ["creative", "observant", "aesthetic"],
        }
    elif any(keyword in text_blob for keyword in ["hike", "run", "tennis", "travel", "outdoor", "trip", "weekend"]):
        category = {
            "style": "Playful",
            "eq": 7,
            "summary": "You give off energetic, go-do-something chemistry and probably lose interest when people feel too passive.",
            "subcategory": "Adventure flirt",
            "lookingFor": "momentum, spontaneity, and someone who says yes fast",
            "preferredBadges": ["Weekend trips", "Run club", "City walks", "Travel brain"],
            "preferredTraits": ["active", "curious", "spontaneous"],
        }
    elif any(keyword in text_blob for keyword in ["wine", "music", "late", "night", "playlist", "bar", "ramen", "city"]):
        category = {
            "style": "Direct",
            "eq": 7,
            "summary": "You read like someone who wants immediate spark, strong banter, and a little edge instead of soft maybe-energy.",
            "subcategory": "Night owl charmer",
            "lookingFor": "playful tension with someone socially confident and sharp",
            "preferredBadges": ["Late shows", "night owl", "Natural wine", "Debate night"],
            "preferredTraits": ["social", "witty", "bold"],
        }

    if len(messages) >= 4 and sum("?" in str(message) for message in messages) >= 2:
        category["eq"] = min(10, int(category["eq"]) + 1)
        category["summary"] = "You ask enough real questions that your ideal match probably needs both chemistry and conversational range."

    return category


def get_ai_response(user_message: str, user_name: str = "User", history: list = None) -> str:
    """Get AI response with full conversation history"""
    if not GEMINI_API_KEY:
        logger.warning("No API key, using fallback")
        return "Hey! Sorry, I'm having trouble connecting right now. What were you saying?"

    try:
        model = genai.GenerativeModel(
            MODEL_NAME,
            system_instruction=ALEX_PERSONA
        )

        chat_history = []
        if history:
            for msg in history:
                role = "model" if msg.get("isAi") else "user"
                chat_history.append({
                    "role": role,
                    "parts": [{"text": msg.get("text", "")}]
                })

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message)
        return response.text.strip()

    except Exception as e:
        logger.error(f"Gemini API error: {type(e).__name__}: {e}")
        return f"Hmm, brain freeze for a sec. Can you say that again?"


def build_vibe_profile(profile_context: Optional[dict] = None, messages: Optional[list] = None) -> dict:
    """Build a vibe profile from onboarding context and optional chat messages."""
    fallback = _heuristic_vibe_profile(profile_context, messages)

    if not GEMINI_API_KEY:
        return fallback

    try:
        model = genai.GenerativeModel(MODEL_NAME)

        profile_context = profile_context or {}
        interests = ", ".join(profile_context.get("interests", [])) or "not provided"
        bio = profile_context.get("bio") or "not provided"
        location = profile_context.get("location") or "not provided"
        messages_text = "\n".join([f"- {m}" for m in (messages or []) if m]) or "- no conversation yet"

        prompt = f"""You are analyzing a dating app user before matching them.
Infer both who they are and the kind of people they are likely to genuinely want.
Reply with ONLY valid JSON, no markdown, no extra text.

Format:
{{
  "style": "1-2 word engagement style",
  "eq": 1-10 emotional intelligence score,
  "summary": "1 sentence behavioral insight",
  "subcategory": "2-4 word dating archetype",
  "lookingFor": "1 sentence describing the kind of connection they are actually looking for",
  "preferredBadges": ["3-5 short badge phrases that should match profile tags"],
  "preferredTraits": ["3 short words describing preferred partner traits"]
}}

Onboarding signals:
- bio: {bio}
- location: {location}
- interests: {interests}

Conversation signals:
{messages_text}
"""

        response = model.generate_content(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        analysis = json.loads(text)
        return {
            "style": str(analysis.get("style", fallback["style"]))[:20],
            "eq": int(analysis.get("eq", fallback["eq"])),
            "summary": str(analysis.get("summary", fallback["summary"]))[:220],
            "subcategory": str(analysis.get("subcategory", fallback["subcategory"]))[:40],
            "lookingFor": str(analysis.get("lookingFor", fallback["lookingFor"]))[:220],
            "preferredBadges": [str(item)[:40] for item in analysis.get("preferredBadges", fallback["preferredBadges"])[:5]],
            "preferredTraits": [str(item)[:24] for item in analysis.get("preferredTraits", fallback["preferredTraits"])[:5]],
        }

    except Exception as e:
        logger.error(f"Vibe profile error: {type(e).__name__}: {e}")
        return fallback


def analyze_behavior(messages: list, profile_context: Optional[dict] = None) -> dict:
    """Analyze user behavior from their conversation messages and merge it with profile context."""
    return build_vibe_profile(profile_context, messages)
