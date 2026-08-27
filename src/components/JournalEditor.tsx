import React, { useState, useEffect, useRef } from 'react';
import { EmotionCategory, JournalEntry, ReflectionSynthesis, VoiceSettings } from '../types';
import { 
  Save, 
  Sparkles, 
  MessageSquareHeart, 
  Download, 
  Check, 
  AlertCircle,
  Feather,
  Plus,
  Volume2,
  VolumeX,
  Square,
  Mic,
  MicOff
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { exportEntryAsMarkdown } from '../utils/storage';
import { 
  speakText, 
  stopSpeaking, 
  createSpeechRecognizer, 
  isSpeechRecognitionSupported 
} from '../utils/voiceService';

interface JournalEditorProps {
  currentEntry: JournalEntry | null;
  onSaveEntry: (entry: JournalEntry) => void;
  onDeleteEntry?: (id: string) => void;
  onNewEntry: () => void;
  initialPrompt?: string;
  voiceSettings: VoiceSettings;
  onOpenVoiceSettings: () => void;
}

const MOODS: EmotionCategory[] = [
  'Grounded',
  'Overwhelmed',
  'Uncertain',
  'Hopeful',
  'Restless',
  'Grateful',
  'Heavy-hearted',
  'Curious',
  'Frustrated',
  'Peaceful',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  currentEntry,
  onSaveEntry,
  onNewEntry,
  initialPrompt,
  voiceSettings,
  onOpenVoiceSettings,
}) => {
  const [title, setTitle] = useState(currentEntry?.title || '');
  const [content, setContent] = useState(
    currentEntry?.content || (initialPrompt ? `> Inquiring prompt: ${initialPrompt}\n\n` : '')
  );
  const [mood, setMood] = useState<EmotionCategory>(currentEntry?.mood || 'Grounded');
  const [companionReflection, setCompanionReflection] = useState<string | undefined>(
    currentEntry?.companionReflection
  );
  const [synthesis, setSynthesis] = useState<ReflectionSynthesis | undefined>(
    currentEntry?.synthesis
  );

  const [isReflecting, setIsReflecting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Spoken Voice State
  const [speakingType, setSpeakingType] = useState<'content' | 'companion' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognizerRef = useRef<any>(null);

  // Sync state when selected entry changes
  useEffect(() => {
    stopSpeaking();
    setSpeakingType(null);
    if (currentEntry) {
      setTitle(currentEntry.title);
      setContent(currentEntry.content);
      setMood(currentEntry.mood);
      setCompanionReflection(currentEntry.companionReflection);
      setSynthesis(currentEntry.synthesis);
    } else {
      setTitle('');
      setContent(initialPrompt ? `> Inquiring prompt: ${initialPrompt}\n\n` : '');
      setMood('Grounded');
      setCompanionReflection(undefined);
      setSynthesis(undefined);
    }
  }, [currentEntry, initialPrompt]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Toggle Voice Playback for Content or Companion Mirror
  const handleToggleSpeak = (type: 'content' | 'companion') => {
    if (speakingType === type) {
      stopSpeaking();
      setSpeakingType(null);
      return;
    }

    const textToSpeak = type === 'content' ? content : companionReflection;
    if (!textToSpeak) return;

    setSpeakingType(type);
    speakText(
      textToSpeak,
      voiceSettings,
      () => setSpeakingType(type),
      () => setSpeakingType(null),
      () => setSpeakingType(null)
    );
  };

  // Toggle Speech Recognition Dictation into Journal Content
  const handleToggleDictation = () => {
    if (isListening) {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setErrorBanner('Voice dictation is not supported in this browser.');
      return;
    }

    try {
      const recognizer = createSpeechRecognizer(
        (transcript, isFinal) => {
          if (isFinal) {
            setContent((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        },
        () => setIsListening(true),
        () => setIsListening(false),
        (err) => {
          setErrorBanner(err);
          setIsListening(false);
        }
      );

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (err: any) {
      console.error('Failed to start dictation:', err);
      setErrorBanner('Microphone initialization failed.');
      setIsListening(false);
    }
  };

  // Save current entry
  const handleSave = () => {
    if (!content.trim()) {
      setErrorBanner('Please write something before saving.');
      return;
    }

    const newOrUpdatedEntry: JournalEntry = {
      id: currentEntry?.id || `entry-${Date.now()}`,
      title: title.trim() || `Reflection — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      content: content.trim(),
      mood,
      date: currentEntry?.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companionReflection,
      synthesis,
      wordCount,
    };

    onSaveEntry(newOrUpdatedEntry);
    setSaveToast(true);
    setErrorBanner(null);
    setTimeout(() => setSaveToast(false), 3000);
  };

  // Request empathetic reflection companion feedback on the written entry
  const handleAskCompanion = async () => {
    if (!content.trim()) {
      setErrorBanner('Write down your thoughts first before asking for companion reflection.');
      return;
    }

    setIsReflecting(true);
    setErrorBanner(null);

    try {
      const response = await fetch('/api/journal/reflect-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled Entry',
          content,
          mood,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to obtain companion reflection');
      }

      const data = await response.json();
      setCompanionReflection(data.companionReflection);

      if (voiceSettings.autoSpeak && data.companionReflection) {
        handleToggleSpeak('companion');
      }
    } catch (err: any) {
      console.error('Error getting companion reflection:', err);
      setErrorBanner('Unable to generate companion reflection right now. Please try again.');
    } finally {
      setIsReflecting(false);
    }
  };

  // Synthesize key takeaways and patterns
  const handleSynthesize = async () => {
    if (!content.trim()) {
      setErrorBanner('Write down your thoughts first to synthesize insights.');
      return;
    }

    setIsSynthesizing(true);
    setErrorBanner(null);

    try {
      const response = await fetch('/api/journal/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize entry');
      }

      const data: ReflectionSynthesis = await response.json();
      setSynthesis(data);
    } catch (err: any) {
      console.error('Error synthesizing entry:', err);
      setErrorBanner('Unable to synthesize entry takeaways. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#FDFCFB] overflow-y-auto px-4 sm:px-10 py-8 pb-24">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Top Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-[#EEECE8] shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              id="btn-journal-new"
              onClick={onNewEntry}
              className="px-3.5 py-1.5 rounded-full bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] text-xs font-medium transition-colors flex items-center gap-1 border border-[#EEECE8]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Page</span>
            </button>

            {/* Spoken Voice Dictation in Journal Toolbar */}
            <button
              id="btn-journal-dictate"
              onClick={handleToggleDictation}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse shadow-xs'
                  : 'bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] border-[#EEECE8]'
              }`}
              title="Dictate journal entry using your voice"
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#8C8881]" />
                  <span>Voice Dictation</span>
                </>
              )}
            </button>

            {/* Read Aloud Journal Page */}
            {content.trim() && (
              <button
                id="btn-journal-read-aloud"
                onClick={() => handleToggleSpeak('content')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                  speakingType === 'content'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] border-[#EEECE8]'
                }`}
                title="Read written page aloud"
              >
                {speakingType === 'content' ? (
                  <>
                    <Square className="w-3 h-3 fill-emerald-800" />
                    <span>Stop Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#8C8881]" />
                    <span className="hidden sm:inline">Listen</span>
                  </>
                )}
              </button>
            )}

            <div className="w-px h-4 bg-[#EEECE8]" />
            <span className="text-xs text-[#8C8881] font-mono">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-invite-companion"
              onClick={handleAskCompanion}
              disabled={isReflecting || !content.trim()}
              className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#F7F6F3] text-[#3C3833] disabled:opacity-40 text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#EEECE8]"
              title="Have your companion read and gently mirror this page"
            >
              <MessageSquareHeart className="w-3.5 h-3.5 text-[#8C8881]" />
              <span>{isReflecting ? 'Reflecting...' : 'Invite Mirror'}</span>
            </button>

            <button
              id="btn-synthesize-journal"
              onClick={handleSynthesize}
              disabled={isSynthesizing || !content.trim()}
              className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] hover:bg-[#F7F6F3] text-[#3C3833] disabled:opacity-40 text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#EEECE8]"
              title="Identify recurring themes and polarities"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8C8881]" />
              <span className="hidden sm:inline">{isSynthesizing ? 'Synthesizing...' : 'Synthesize'}</span>
            </button>

            {currentEntry && (
              <button
                id="btn-export-journal-md"
                onClick={() => exportEntryAsMarkdown(currentEntry)}
                className="p-2 rounded-full text-[#8C8881] hover:text-[#3C3833] hover:bg-[#F7F6F3] transition-colors"
                title="Download page as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-save-journal-entry"
              onClick={handleSave}
              disabled={!content.trim()}
              className="px-5 py-2 rounded-full bg-[#3C3833] hover:bg-black text-white disabled:opacity-40 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {saveToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Page</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorBanner && (
          <div className="p-4 bg-[#FAF9F6] border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-rose-700 hover:text-rose-900 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Writing Canvas */}
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-[#EEECE8] shadow-xs flex flex-col gap-6">
          {/* Atmosphere & Emotion Anchor */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#EEECE8]">
            <div className="flex items-center gap-2 text-[#8C8881] text-xs font-medium">
              <Feather className="w-4 h-4" />
              <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Atmosphere:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    mood === m
                      ? 'bg-[#3C3833] text-white font-medium shadow-2xs'
                      : 'bg-[#F7F6F3] text-[#5C5852] hover:bg-[#EEECE8]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input
            id="input-journal-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of this reflection..."
            className="w-full font-serif text-2xl sm:text-3xl text-[#3C3833] placeholder-[#D6D3D1] border-none outline-hidden p-0 bg-transparent"
          />

          {/* Text Area */}
          <textarea
            id="input-journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pour your thoughts out here without judging or editing yourself. Tap the microphone icon above if you'd prefer to speak your reflection aloud..."
            rows={14}
            className="w-full font-serif text-[17px] sm:text-[18px] leading-relaxed text-[#4A4743] placeholder-[#D6D3D1] border-none outline-hidden p-0 resize-none bg-transparent"
          />

          {/* Companion Reflection Mirror */}
          <AnimatePresence>
            {companionReflection && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-[#EEECE8] -mx-6 sm:-mx-12 px-6 sm:px-12 py-8 bg-[#FAF9F6] rounded-b-3xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
                      Aura Companion Mirror
                    </span>

                    {/* Speak Companion Mirror Button */}
                    <button
                      onClick={() => handleToggleSpeak('companion')}
                      className={`p-1 rounded-full text-xs transition-colors flex items-center gap-1 ${
                        speakingType === 'companion'
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-[#8C8881] hover:text-[#3C3833] hover:bg-[#EEECE8]'
                      }`}
                      title={speakingType === 'companion' ? 'Stop voice' : 'Listen to companion mirror voice'}
                    >
                      {speakingType === 'companion' ? (
                        <>
                          <Square className="w-3 h-3 fill-emerald-700" />
                          <span className="text-[10px] font-mono text-emerald-700">Speaking...</span>
                        </>
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setCompanionReflection(undefined)}
                    className="text-xs text-[#8C8881] hover:text-[#3C3833] underline"
                  >
                    Clear Mirror
                  </button>
                </div>

                <div className={`p-6 rounded-[24px] rounded-bl-none bg-[#F7F6F3] border ${
                  speakingType === 'companion' ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-[#EEECE8]'
                } text-[17px] sm:text-[18px] leading-relaxed font-serif italic text-[#4A4743]`}>
                  <Markdown>{companionReflection}</Markdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Synthesis Card */}
          <AnimatePresence>
            {synthesis && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-6 rounded-2xl bg-[#FAF9F6] border border-[#EEECE8] flex flex-col gap-4 text-xs text-[#5C5852]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
                    Extracted Synthesis
                  </span>
                  <button
                    onClick={() => setSynthesis(undefined)}
                    className="text-[11px] text-[#8C8881] hover:text-[#3C3833]"
                  >
                    Hide
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-[#8C8881]">POLARITIES & PATTERNS</span>
                    <ul className="list-disc list-inside space-y-1 text-[#3C3833]">
                      {synthesis.identifiedPatterns.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#EEECE8] flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8881]">
                      GROUNDING AFFIRMATION
                    </span>
                    <p className="font-serif italic text-sm text-[#4A4743]">
                      "{synthesis.groundingAffirmation}"
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
