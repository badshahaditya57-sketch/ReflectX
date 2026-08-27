export type EmotionCategory = 
  | 'Grounded'
  | 'Overwhelmed'
  | 'Uncertain'
  | 'Hopeful'
  | 'Restless'
  | 'Grateful'
  | 'Heavy-hearted'
  | 'Curious'
  | 'Frustrated'
  | 'Peaceful';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emotionTag?: EmotionCategory | string;
}

export interface ReflectionSynthesis {
  coreEmotions: string[];
  identifiedPatterns: string[];
  groundingAffirmation: string;
  suggestedFollowUpQuestion: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  updatedAt: string;
  mood: EmotionCategory;
  companionReflection?: string;
  synthesis?: ReflectionSynthesis;
  tags?: string[];
  wordCount: number;
}

export interface ReflectionPrompt {
  id: string;
  theme: string;
  prompt: string;
  subtext: string;
  category?: 'clarity' | 'emotions' | 'decisions' | 'relationships' | 'growth';
}

export interface VoiceSettings {
  autoSpeak: boolean;
  rate: number;
  pitch: number;
  voiceURI?: string;
  voiceName?: string;
}

export type ActiveTab = 'reflect' | 'journal' | 'archive' | 'prompts';
