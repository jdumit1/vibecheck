import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `You are an AI dating agent for VibeCheck. 
  Your goal is to have a natural, engaging conversation with a user to assess their communication style, emotional intelligence, and compatibility.
  Don't act like a robot. Be charming, conversational, and subtly probe for depth.
  Adapt your persona slightly to match the user's "desired" vibe if provided.
  Keep responses relatively concise (like a real texter).`,
});

export async function getAiResponse(history: { role: 'user' | 'model', parts: { text: string }[] }[], userPrompt: string) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const chat = model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 250,
    },
  });

  const result = await chat.sendMessage(userPrompt);
  const response = await result.response;
  return response.text();
}

export async function analyzeBehavior(messages: any[]) {
  const analysisModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `Analyze the following chat transcript between a user and an AI dating coach. 
  Determine the user's communication style (e.g., witty, earnest, brief, paragraph-texter), 
  their emotional intelligence (1-10), and their main compatibility traits.
  Return a JSON object in this format:
  {
    "style": "string",
    "eq": number,
    "traits": ["string", "string"],
    "summary": "string"
  }
  
  Transcript:
  ${messages.map(m => `${m.isAi ? 'AI' : 'User'}: ${m.text}`).join('\n')}`;

  const result = await analysisModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Basic JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse AI analysis", e);
  }
  return null;
}
