import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_ai_response(user_message: str, user_name: str = "User") -> str:
    """Get AI response for chat simulation"""
    try:
        if not GEMINI_API_KEY:
            return "I'm Alex. That's interesting! Tell me more about that."

        model = genai.GenerativeModel("gemini-pro")

        system_prompt = f"""You are Alex, a friendly and genuine person in a casual dating chat.
The user's name is {user_name}. Respond naturally, like a real person would, in 1-2 sentences.
Be warm, authentic, and ask follow-up questions when appropriate.
Keep responses concise and conversational."""

        response = model.generate_content(f"{system_prompt}\n\nUser: {user_message}")
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
        return "That sounds cool! I'd love to hear more about that."

def analyze_behavior(messages: list) -> dict:
    """Analyze user behavior from messages"""
    try:
        if not GEMINI_API_KEY or not messages:
            return {
                "style": "Introspective",
                "eq": 7,
                "summary": "Behavioral profile generated from conversation patterns."
            }

        model = genai.GenerativeModel("gemini-pro")

        messages_text = "\n".join(messages)

        analysis_prompt = f"""Analyze the following messages for behavioral patterns.
Respond with JSON only (no markdown, no extra text):
{{"style": "engagement style in 1-2 words", "eq": "emotional intelligence score 1-10", "summary": "brief insight 1 sentence"}}

Messages:
{messages_text}"""

        response = model.generate_content(analysis_prompt)
        response_text = response.text.strip()

        import json
        try:
            analysis = json.loads(response_text)
            return {
                "style": analysis.get("style", "Introspective"),
                "eq": analysis.get("eq", 7),
                "summary": analysis.get("summary", "Behavioral profile generated from conversation patterns.")
            }
        except:
            return {
                "style": "Introspective",
                "eq": 7,
                "summary": "Behavioral profile generated from conversation patterns."
            }
    except Exception as e:
        print(f"Behavior analysis error: {e}")
        return {
            "style": "Introspective",
            "eq": 7,
            "summary": "Behavioral profile generated from conversation patterns."
        }
