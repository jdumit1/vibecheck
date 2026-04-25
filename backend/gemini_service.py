import google.generativeai as genai
import os
import json
import logging
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

MODEL_NAME = "gemini-2.0-flash"

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


def analyze_behavior(messages: list) -> dict:
    """Analyze user behavior from their conversation messages"""
    if not GEMINI_API_KEY or not messages:
        return {
            "style": "Curious",
            "eq": 7,
            "summary": "Profile generated from initial conversation patterns."
        }

    try:
        model = genai.GenerativeModel(MODEL_NAME)

        messages_text = "\n".join([f"- {m}" for m in messages if m])

        prompt = f"""Analyze these chat messages from a user in a dating app conversation.
Score their behavioral patterns. Reply with ONLY valid JSON, no markdown, no extra text.

Format:
{{"style": "1-2 word engagement style", "eq": 1-10 emotional intelligence score, "summary": "1 sentence behavioral insight"}}

Style examples: "Curious", "Reserved", "Playful", "Analytical", "Warm", "Direct"

User messages:
{messages_text}"""

        response = model.generate_content(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        analysis = json.loads(text)
        return {
            "style": str(analysis.get("style", "Curious"))[:20],
            "eq": int(analysis.get("eq", 7)),
            "summary": str(analysis.get("summary", "Behavioral profile generated."))[:200]
        }

    except Exception as e:
        logger.error(f"Behavior analysis error: {type(e).__name__}: {e}")
        return {
            "style": "Curious",
            "eq": 7,
            "summary": "Profile generated from initial conversation patterns."
        }
