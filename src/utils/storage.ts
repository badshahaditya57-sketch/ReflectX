import { JournalEntry, ChatMessage, EmotionCategory } from '../types';

const JOURNAL_STORAGE_KEY = 'reflection_journal_entries_v1';
const CHAT_STORAGE_KEY = 'reflection_chat_history_v1';

/**
 * Utility to strip undefined properties recursively from objects before persisting
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, value) => (value === undefined ? null : value)));
}

export const INITIAL_SAMPLE_ENTRIES: JournalEntry[] = [
  {
    id: 'sample-1',
    title: 'Finding quiet amidst rapid shifts',
    content: 'Today felt unusually loud. Even when the room was silent, my head kept replaying unfinished conversations and upcoming deadlines. I noticed I have this urge to immediately fix every uncomfortable feeling instead of letting it breathe for even five minutes.\n\nWhen I finally took a walk in the evening without headphones, the cool breeze felt like a gentle reminder that not everything needs an immediate answer.',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    mood: 'Restless',
    wordCount: 78,
    companionReflection: 'It takes real honesty to notice that urge to "fix" every uncomfortable feeling. In giving yourself that walk without headphones, you created a small sanctuary of stillness.\n\nWhen the urge to fix things arises, what feeling is usually waiting right beneath it?',
    synthesis: {
      coreEmotions: ['Cognitive Fatigue', 'Seeking Stillness', 'Self-Awareness'],
      identifiedPatterns: ['Equating stillness with lack of productivity', 'Finding solace in sensory grounding outdoors'],
      groundingAffirmation: 'Allowing things to be unfinished is an act of trust in yourself.',
      suggestedFollowUpQuestion: 'How might you give yourself five minutes of quiet before reacting tomorrow?',
    },
  },
];

export function getSavedJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) {
      saveJournalEntries(INITIAL_SAMPLE_ENTRIES);
      return INITIAL_SAMPLE_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading journal entries:', error);
    return [];
  }
}

export function saveJournalEntries(entries: JournalEntry[]): boolean {
  try {
    const sanitized = sanitizePayload(entries);
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (error) {
    console.error('Error saving journal entries:', error);
    return false;
  }
}

export function getSavedChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): boolean {
  try {
    const sanitized = sanitizePayload(messages);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch (error) {
    console.error('Error saving chat history:', error);
    return false;
  }
}

export function clearChatHistory(): void {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

export function exportAllDataAsJSON(): void {
  const data = {
    exportDate: new Date().toISOString(),
    journalEntries: getSavedJournalEntries(),
    chatHistory: getSavedChatHistory(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reflection-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEntryAsMarkdown(entry: JournalEntry): void {
  const md = `# ${entry.title || 'Untitled Reflection'}
*Date: ${new Date(entry.date).toLocaleDateString()} | Mood: ${entry.mood}*

---

${entry.content}

${entry.companionReflection ? `\n---\n\n### Companion Reflection\n${entry.companionReflection}\n` : ''}

${entry.synthesis ? `
### Key Themes & Patterns
- **Core Emotions**: ${entry.synthesis.coreEmotions.join(', ')}
- **Patterns**:
${entry.synthesis.identifiedPatterns.map((p) => `  - ${p}`).join('\n')}
- **Grounding Thought**: "${entry.synthesis.groundingAffirmation}"
- **Next Question**: ${entry.synthesis.suggestedFollowUpQuestion}
` : ''}
`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(entry.title || 'reflection').toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
