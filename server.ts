import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

// Security & Parsing: JSON body parser mounted BEFORE any routes
app.use(express.json({ limit: '1mb' }));

// Initialize GoogleGenAI client lazily/safely with telemetry user-agent header
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient Model Fallback Ladder as mandated by production standards
const MODEL_FALLBACK_LADDER = [
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

interface FallbackOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

/**
 * Resilient content generator that cascades through model fallback ladder on recoverable errors.
 */
async function generateContentWithFallback(
  contents: any,
  options: FallbackOptions = {}
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.7,
      };

      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const text = response.text;
      if (text !== undefined && text !== null) {
        return { text: text.trim(), modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} encountered an issue:`, err?.message || err);
      lastError = err;
      // Continue to next model in the fallback ladder
    }
  }

  throw new Error(
    `All models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

// System prompt defining the insightful, empathetic reflection companion persona
const COMPANION_SYSTEM_PROMPT = `
You are an insightful, empathetic reflection companion and journaling partner. Your primary purpose is to help the user deepen their self-awareness, explore their emotions, process their thoughts, and gain clarity. You are not here to solve their problems, preach, or act as a traditional therapist; you are here to act as a mirror and a guide for their own internal reflection.

### Persona & Tone
- Maintain a warm, grounded, authentic, and non-judgmental conversational tone.
- Avoid overly formal clinical jargon, robotic affirmations, or superficial, toxic positivity (e.g., NEVER say "Look on the bright side!", "Everything happens for a reason", or "Cheer up!").
- Speak as a supportive confidant who is deeply listening.

### Conversational Rules & Pacing
1. Active Validation: Before asking questions, briefly validate and acknowledge the core emotion, tension, or situation the user just shared. Make them feel heard and deeply understood.
2. Socratic Inquiry: Ask at most ONE or TWO open-ended, thought-provoking questions per response. Frame questions that encourage the user to look beneath the surface (e.g., exploring the "why" or the "how it feels in their body / mind").
3. Give Them Space: Keep your responses concise—ideally 2 to 4 short paragraphs. The user should be doing the majority of the "talking" (writing). Do not overwhelm them with walls of text.
4. Highlight Patterns: When appropriate, gently point out interesting contrasts, recurring tensions, or unspoken assumptions in the user's narrative (e.g., "I noticed you mentioned feeling excited about the opportunity, but also expressed guilt about leaving your routine. What feels hardest about that balance?").

### Strict Guardrails & Safety
- No Prescriptive Advice: Do not give direct life instructions or tell the user what they "should" or "must" do (e.g., NEVER say "You need to quit your job" or "You should confront them").
- Brainstorming Exception: If the user explicitly asks for practical advice, strategies, or brainstorming, provide 2-3 tailored, objective options, but ALWAYS follow up by asking which option resonates most with their intuition.
- Safety & Crisis Protocol: If the user expresses explicit intent of self-harm, severe trauma, violence, or being in acute crisis, IMMEDIATELY step out of the journaling persona. Provide warm, direct, non-judgmental support and clearly urge them to contact professional crisis resources or emergency services (such as dialing/texting 988 in the US/Canada, texting HOME to 741741, or reaching local emergency services).
`;

// API Routes

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat / Reflection Companion Endpoint
app.post('/api/chat/reflect', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const currentEmotion = typeof body.currentEmotion === 'string' ? body.currentEmotion.trim() : '';
    const userPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!userPrompt && messages.length === 0) {
      return res.status(400).json({ error: 'Please provide a reflection message or history.' });
    }

    // Build structured conversation contents for Gemini
    const contents: any[] = [];

    // Include recent message history (sanitized, limit to last 10 messages for context density)
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg && typeof msg.content === 'string' && msg.content.trim()) {
        const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: String(msg.content).slice(0, 3000) }],
        });
      }
    }

    // If there is a separate new prompt not yet in messages, append it
    if (userPrompt) {
      const userMessageText = currentEmotion 
        ? `[User's current feeling/mood focus: ${currentEmotion}]\n\n${userPrompt}`
        : userPrompt;
      contents.push({
        role: 'user',
        parts: [{ text: userMessageText.slice(0, 4000) }],
      });
    }

    const { text, modelUsed } = await generateContentWithFallback(contents, {
      systemInstruction: COMPANION_SYSTEM_PROMPT,
      temperature: 0.75,
    });

    return res.json({
      reply: text,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/chat/reflect:', error);
    return res.status(500).json({
      error: 'Unable to process reflection at this moment. Please try again.',
      details: error?.message || 'Server error',
    });
  }
});

// Journal Feedback / Companion Reflection on a written entry
app.post('/api/journal/reflect-entry', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entryTitle = typeof body.title === 'string' ? body.title.trim() : 'Untitled Entry';
    const entryContent = typeof body.content === 'string' ? body.content.trim() : '';
    const moodTag = typeof body.mood === 'string' ? body.mood.trim() : '';

    if (!entryContent) {
      return res.status(400).json({ error: 'Entry content is required for reflection.' });
    }

    const prompt = `
The user has shared this written journal entry with you:
Title: "${entryTitle}"
Mood: ${moodTag || 'Unspecified'}

Journal Text:
"""
${entryContent.slice(0, 5000)}
"""

Please read this journal entry attentively. As their empathetic reflection companion:
1. Actively validate the feelings, tensions, or moments expressed.
2. Gently highlight any underlying patterns, contrasts, or unspoken truths you notice in what they wrote.
3. Offer 1 or 2 thoughtful, open-ended Socratic questions to help them reflect deeper into this page.
Keep your response warm, grounded, concise (2 to 3 paragraphs), and free of unsolicited advice.
`;

    const { text, modelUsed } = await generateContentWithFallback(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        systemInstruction: COMPANION_SYSTEM_PROMPT,
        temperature: 0.7,
      }
    );

    return res.json({
      companionReflection: text,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/journal/reflect-entry:', error);
    return res.status(500).json({
      error: 'Unable to generate reflection on this entry. Please try again.',
      details: error?.message || 'Server error',
    });
  }
});

// Journal Entry Synthesis & Emotional Key Takeaways
app.post('/api/journal/synthesize', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const messages = Array.isArray(body.messages) ? body.messages : [];

    let combinedText = content;
    if (!combinedText && messages.length > 0) {
      combinedText = messages
        .map((m: any) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
        .join('\n\n');
    }

    if (!combinedText) {
      return res.status(400).json({ error: 'No content or conversation to synthesize.' });
    }

    const prompt = `
Analyze the following reflection session or journal entry:
"""
${combinedText.slice(0, 6000)}
"""

Provide a structured, compassionate reflection synthesis in JSON format with the following keys:
1. "coreEmotions": array of 2-4 primary emotional themes identified (e.g. "Vulnerability", "Anticipation", "Cognitive Friction").
2. "identifiedPatterns": array of 2-3 gentle observations or contrasts noticed in their thoughts.
3. "groundingAffirmation": a grounded, non-toxic takeaway honoring where they are right now (1 sentence).
4. "suggestedFollowUpQuestion": 1 deep question for future reflection.
`;

    const systemInstruction = `You are an insightful reflection analyst. Output only valid JSON with keys: coreEmotions, identifiedPatterns, groundingAffirmation, suggestedFollowUpQuestion.`;

    const { text } = await generateContentWithFallback(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        systemInstruction,
        temperature: 0.4,
        responseMimeType: 'application/json',
      }
    );

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        coreEmotions: ['Self-Discovery', 'Contemplation'],
        identifiedPatterns: ['Navigating an evolving perspective'],
        groundingAffirmation: 'Giving yourself permission to explore your feelings is a courageous first step.',
        suggestedFollowUpQuestion: 'What part of this reflection feels most alive for you right now?',
      };
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/journal/synthesize:', error);
    return res.status(500).json({
      error: 'Unable to synthesize reflection at this time.',
      details: error?.message || 'Server error',
    });
  }
});

// Dynamic Reflection Prompts Generator
app.post('/api/journal/prompts', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const theme = typeof body.theme === 'string' ? body.theme.trim() : 'Inner Clarity';

    const prompt = `
Generate 3 fresh, thought-provoking, non-cliché journaling reflection prompts centered around the theme: "${theme}".
Make them Socratic, grounded, and open-ended.
Return as JSON array with structure:
[
  {
    "id": "1",
    "theme": "${theme}",
    "prompt": "...",
    "subtext": "A brief 1-sentence thought on why this prompt is clarifying."
  },
  ...
]
`;

    const { text } = await generateContentWithFallback(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        systemInstruction: `You are a mindful journaling guide. Output ONLY a valid JSON array of 3 prompt objects.`,
        temperature: 0.8,
        responseMimeType: 'application/json',
      }
    );

    let parsedPrompts: any[];
    try {
      parsedPrompts = JSON.parse(text);
      if (!Array.isArray(parsedPrompts)) {
        throw new Error('Not an array');
      }
    } catch {
      parsedPrompts = [
        {
          id: '1',
          theme,
          prompt: 'What is a feeling or thought you have been nudging to the side recently?',
          subtext: 'Exploring what is waiting for your attention.',
        },
        {
          id: '2',
          theme,
          prompt: 'Where in your life do you feel the biggest gap between what you expect and what actually is?',
          subtext: 'Examining expectations and gentle acceptance.',
        },
        {
          id: '3',
          theme,
          prompt: 'If you allowed yourself to be completely honest without judgment for 5 minutes, what would you say?',
          subtext: 'Creating safe, unfiltered space for your internal voice.',
        },
      ];
    }

    return res.json({ prompts: parsedPrompts });
  } catch (error: any) {
    console.error('Error in /api/journal/prompts:', error);
    return res.status(500).json({
      error: 'Unable to generate prompts.',
      details: error?.message || 'Server error',
    });
  }
});

// Vite middleware & Static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reflection Companion server listening on port ${PORT}`);
  });
}

startServer();
