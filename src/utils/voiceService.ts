import { VoiceSettings } from '../types';

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  autoSpeak: false,
  rate: 0.92, // Mindful, measured cadence
  pitch: 1.0,
};

const VOICE_SETTINGS_STORAGE_KEY = 'reflectx_voice_settings_v1';

/**
 * Load voice settings from localStorage
 */
export function getSavedVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY) || localStorage.getItem('solace_voice_settings_v1');
    if (raw) {
      return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load voice settings:', e);
  }
  return DEFAULT_VOICE_SETTINGS;
}

/**
 * Save voice settings to localStorage
 */
export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save voice settings:', e);
  }
}

/**
 * Clean markdown symbols from text before vocalizing
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#+\s+/gm, '') // Remove heading hashes
    .replace(/[*_~`>#]/g, '') // Remove markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Clean links
    .replace(/\n+/g, '. ') // Turn multiple line breaks into pauses
    .trim();
}

/**
 * Retrieve available browser synthesis voices
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };

    // Fallback timeout in case onvoiceschanged does not fire
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speak given text aloud using the configured voice settings
 */
export function speakText(
  text: string,
  settings: VoiceSettings = DEFAULT_VOICE_SETTINGS,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.(new Error('Text-to-speech is not supported in this browser.'));
    return;
  }

  // Cancel any active audio playback first
  stopSpeaking();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return;

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = settings.rate || 0.92;
  utterance.pitch = settings.pitch || 1.0;

  // Attempt to bind selected voice
  const voices = window.speechSynthesis.getVoices();
  if (settings.voiceURI) {
    const matched = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (matched) {
      utterance.voice = matched;
    }
  } else {
    // Prefer warm natural English voices if available
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          v.name.includes('Victoria') ||
          v.name.includes('Google') ||
          v.name.includes('Daniel'))
    );
    if (preferred) {
      utterance.voice = preferred;
    }
  }

  utterance.onstart = () => {
    activeUtterance = utterance;
    onStart?.();
  };

  utterance.onend = () => {
    activeUtterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    // Ignore canceled errors triggered on stop
    if (e.error === 'canceled' || e.error === 'interrupted') {
      activeUtterance = null;
      onEnd?.();
      return;
    }
    console.error('Speech synthesis error:', e);
    activeUtterance = null;
    onError?.(e);
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech playback
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

/**
 * Check if speech is currently playing
 */
export function isCurrentlySpeaking(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Check if browser supports speech recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window ||
    'mozSpeechRecognition' in window ||
    'msSpeechRecognition' in window
  );
}

/**
 * Create a speech recognition listener instance
 */
export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: string) => void
): any {
  if (!isSpeechRecognitionSupported()) {
    onError?.('Speech recognition is not supported in this browser.');
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition;

  const recognizer = new SpeechRecognition();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = 'en-US';

  recognizer.onstart = () => {
    onStart?.();
  };

  recognizer.onresult = (event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const trans = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += trans;
      } else {
        interim += trans;
      }
    }

    if (final) {
      onResult(final, true);
    } else if (interim) {
      onResult(interim, false);
    }
  };

  recognizer.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      onError?.('Microphone access was denied. Please allow microphone permissions.');
    } else if (event.error === 'no-speech') {
      // Ignored: silence detected
    } else {
      onError?.(`Voice recognition issue: ${event.error}`);
    }
  };

  recognizer.onend = () => {
    onEnd?.();
  };

  return recognizer;
}
