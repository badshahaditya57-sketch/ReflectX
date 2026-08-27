import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, EmotionCategory, ReflectionSynthesis, VoiceSettings } from '../types';
import { 
  Send, 
  Sparkles, 
  RotateCcw, 
  BookmarkPlus, 
  Download, 
  AlertCircle, 
  Check, 
  Wind,
  Layers,
  Heart,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Square,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  speakText, 
  stopSpeaking, 
  createSpeechRecognizer, 
  isSpeechRecognitionSupported 
} from '../utils/voiceService';

interface ReflectionChatProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onSaveToJournal: (title: string, content: string, mood: EmotionCategory, companionReflection?: string) => void;
  onOpenCrisisModal: () => void;
  selectedEmotion: EmotionCategory;
  setSelectedEmotion: (emotion: EmotionCategory) => void;
  voiceSettings: VoiceSettings;
  onOpenVoiceSettings: () => void;
}

const EMOTIONS: EmotionCategory[] = [
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

const REFLECTION_STARTERS = [
  'There is a specific tension between wanting quiet silence and the pressure to be productive today.',
  'I feel pulled in two different directions regarding a major choice...',
  'Something happened today that I keep replaying in my mind without resolution...',
  'I notice I keep delaying something important, but I cannot tell what fear is driving it...',
];

export const ReflectionChat: React.FC<ReflectionChatProps> = ({
  messages,
  setMessages,
  onSaveToJournal,
  onOpenCrisisModal,
  selectedEmotion,
  setSelectedEmotion,
  voiceSettings,
  onOpenVoiceSettings,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [synthesis, setSynthesis] = useState<ReflectionSynthesis | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Spoken Voice State
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const recognizerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clean up speech when unmounting or changing
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

  // Handle Play/Stop Spoken Voice for a specific message
  const handleToggleSpeakMessage = (msgId: string, content: string) => {
    if (speakingMessageId === msgId) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);
    speakText(
      content,
      voiceSettings,
      () => setSpeakingMessageId(msgId),
      () => setSpeakingMessageId(null),
      () => setSpeakingMessageId(null)
    );
  };

  // Toggle Speech-to-Text Dictation
  const handleToggleVoiceDictation = () => {
    if (isListening) {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setInterimVoiceText('');
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setErrorBanner('Speech dictation is not supported in this browser environment.');
      return;
    }

    try {
      const recognizer = createSpeechRecognizer(
        (transcript, isFinal) => {
          if (isFinal) {
            setInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
            setInterimVoiceText('');
          } else {
            setInterimVoiceText(transcript);
          }
        },
        () => setIsListening(true),
        () => {
          setIsListening(false);
          setInterimVoiceText('');
        },
        (err) => {
          setErrorBanner(err);
          setIsListening(false);
          setInterimVoiceText('');
        }
      );

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (e: any) {
      console.error('Failed to initialize speech recognizer:', e);
      setErrorBanner('Microphone initialization failed. Please check browser permissions.');
      setIsListening(false);
    }
  };

  // Handle sending message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? (input + (interimVoiceText ? ` ${interimVoiceText}` : ''))).trim();
    if (!textToSend || isLoading) return;

    if (isListening && recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setInterimVoiceText('');
    }

    setErrorBanner(null);
    setSaveSuccess(false);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
      emotionTag: selectedEmotion,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setInterimVoiceText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          currentEmotion: selectedEmotion,
          prompt: textToSend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'I am listening deeply. What else comes up as you sit with this?',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-read aloud if enabled in Voice Settings
      if (voiceSettings.autoSpeak) {
        handleToggleSpeakMessage(assistantMessage.id, assistantMessage.content);
      }
    } catch (err: any) {
      console.error('Reflection request error:', err);
      setErrorBanner(err.message || 'Unable to connect to the reflection partner. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Synthesize Key Takeaways from the current dialogue
  const handleSynthesize = async () => {
    if (messages.length === 0 || isSynthesizing) return;
    setIsSynthesizing(true);
    setErrorBanner(null);

    try {
      const response = await fetch('/api/journal/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error('Synthesis failed');
      const data: ReflectionSynthesis = await response.json();
      setSynthesis(data);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setErrorBanner('Could not synthesize session insights. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Save conversation into Journal Archive
  const handleSaveToJournal = () => {
    if (messages.length === 0) return;
    
    const firstUser = messages.find((m) => m.role === 'user');
    const titleSnippet = firstUser 
      ? firstUser.content.slice(0, 45) + (firstUser.content.length > 45 ? '...' : '')
      : `Reflection Session - ${new Date().toLocaleDateString()}`;

    const conversationDigest = messages
      .map((m) => `**${m.role === 'user' ? 'Me' : 'Companion'}** (${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}):\n${m.content}`)
      .join('\n\n');

    const lastCompanion = [...messages].reverse().find((m) => m.role === 'assistant');

    onSaveToJournal(
      titleSnippet,
      conversationDigest,
      selectedEmotion,
      lastCompanion?.content
    );

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Download Transcript as Markdown
  const handleExportTranscript = () => {
    if (messages.length === 0) return;
    const content = `# Reflection Dialogue Transcript
*Date: ${new Date().toLocaleString()} | Atmosphere Anchor: ${selectedEmotion}*

---

${messages.map((m) => `### ${m.role === 'user' ? 'My Reflection' : 'Companion Response'}\n\n${m.content}\n`).join('\n---\n\n')}

${synthesis ? `
## Key Insights & Synthesis
- **Core Emotions**: ${synthesis.coreEmotions.join(', ')}
- **Patterns & Polarities Noticed**:
${synthesis.identifiedPatterns.map((p) => `  - ${p}`).join('\n')}
- **Grounding Note**: "${synthesis.groundingAffirmation}"
- **To Ponder Next**: ${synthesis.suggestedFollowUpQuestion}
` : ''}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reflection-session-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSession = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
    if (messages.length > 0 && !window.confirm('Start a fresh reflection session? Your previous conversation can be saved to your archive first.')) {
      return;
    }
    setMessages([]);
    setSynthesis(null);
    setErrorBanner(null);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#FDFCFB]">
      {/* Primary Dialogue Section */}
      <section className="flex-1 flex flex-col border-r border-[#EEECE8] bg-white relative">
        {/* Sub-header Toolbar */}
        <div className="px-6 sm:px-10 py-3.5 border-b border-[#EEECE8] bg-[#FDFCFB] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#A8A29D] shrink-0 mr-1">
              Atmosphere:
            </span>
            <div className="flex items-center gap-1.5">
              {EMOTIONS.slice(0, 5).map((emo) => (
                <button
                  key={emo}
                  onClick={() => setSelectedEmotion(emo)}
                  className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap ${
                    selectedEmotion === emo
                      ? 'bg-[#3C3833] text-white font-medium shadow-2xs'
                      : 'bg-[#F7F6F3] text-[#5C5852] hover:bg-[#EEECE8]'
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Dedicated Microphone Switch in Toolbar */}
            <div 
              id="container-mic-switch-toolbar"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                isListening 
                  ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-2xs' 
                  : 'bg-[#F7F6F3] border-[#EEECE8] text-[#5C5852]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-[#A8A29D]'}`} />
                {isListening ? <Mic className="w-3.5 h-3.5 text-rose-600" /> : <MicOff className="w-3.5 h-3.5 text-[#8C8881]" />}
                <span className="hidden sm:inline text-xs font-medium">
                  {isListening ? 'Mic Active' : 'Mic Off'}
                </span>
              </div>

              <button
                id="btn-microphone-switch-toolbar"
                type="button"
                role="switch"
                aria-checked={isListening}
                onClick={handleToggleVoiceDictation}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ml-0.5 cursor-pointer ${
                  isListening ? 'bg-rose-500 shadow-2xs' : 'bg-[#D6D3D1] hover:bg-[#C4C1BC]'
                }`}
                title={isListening ? "Turn microphone switch OFF" : "Turn microphone switch ON"}
                aria-label={isListening ? "Turn microphone switch OFF" : "Turn microphone switch ON"}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform shadow-2xs ${
                    isListening ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Spoken Voice Settings Button */}
            <button
              id="btn-chat-voice-settings"
              onClick={onOpenVoiceSettings}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                voiceSettings.autoSpeak
                  ? 'bg-[#3C3833] text-white border-[#3C3833]'
                  : 'bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] border-[#EEECE8]'
              }`}
              title="Configure companion voice narration & audio pacing"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {voiceSettings.autoSpeak ? 'Voice On' : 'Voice'}
              </span>
            </button>

            {messages.length > 0 && (
              <>
                <button
                  id="btn-synthesize-chat"
                  onClick={handleSynthesize}
                  disabled={isSynthesizing}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] transition-colors flex items-center gap-1.5 border border-[#EEECE8]"
                  title="Synthesize recurring themes and polarities"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8C8881]" />
                  <span className="hidden sm:inline">{isSynthesizing ? 'Synthesizing...' : 'Synthesize'}</span>
                </button>

                <button
                  id="btn-save-chat-to-journal"
                  onClick={handleSaveToJournal}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] transition-colors flex items-center gap-1.5 border border-[#EEECE8]"
                  title="Save conversation as a journal page"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-emerald-800">Saved</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-[#8C8881]" />
                      <span className="hidden sm:inline">Save</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-export-chat-md"
                  onClick={handleExportTranscript}
                  className="p-1.5 rounded-full text-[#8C8881] hover:text-[#3C3833] hover:bg-[#F7F6F3] transition-colors"
                  title="Download transcript as Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              id="btn-reset-chat"
              onClick={handleResetSession}
              className="p-1.5 rounded-full text-[#A8A29D] hover:text-[#3C3833] hover:bg-[#F7F6F3] transition-colors"
              title="Fresh reflection session"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorBanner && (
          <div className="mx-6 mt-4 p-3.5 bg-[#FAF9F6] border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-3 py-1 bg-[#3C3833] text-white rounded-full text-xs font-medium hover:bg-black"
            >
              Retry
            </button>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 p-6 sm:p-10 flex flex-col gap-6 sm:gap-8 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="my-auto max-w-lg mx-auto text-center flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EEECE8] flex items-center justify-center text-[#8C8881]">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#3C3833]">
                A Quiet Space for Clarity
              </h2>
              <p className="text-sm text-[#5C5852] leading-relaxed">
                Speak freely about whatever is resting on your mind. The companion will listen without judgment, reflect tensions you hold, and pose clarifying questions.
              </p>

              <div className="w-full flex flex-col gap-2.5 mt-4 text-left">
                <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D] text-center">
                  Starter Reflections
                </span>
                {REFLECTION_STARTERS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(starter)}
                    className="p-4 rounded-2xl bg-[#F7F6F3] hover:bg-[#EEECE8] border border-[#EEECE8] text-xs text-[#4A4743] text-left transition-all leading-relaxed hover:text-[#3C3833]"
                  >
                    "{starter}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              const isSpeakingThis = speakingMessageId === message.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`max-w-[540px] flex flex-col gap-1.5 ${isUser ? 'self-end' : 'self-start'}`}
                >
                  <div className={`flex items-center gap-2 ${isUser ? 'justify-end mr-2' : 'justify-start ml-2'}`}>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#A8A29D]">
                      {isUser ? 'You' : 'Companion'}
                    </span>

                    {/* Spoken Voice Speaker Button on Companion Message */}
                    {!isUser && (
                      <button
                        onClick={() => handleToggleSpeakMessage(message.id, message.content)}
                        className={`p-1 rounded-full text-xs transition-colors flex items-center gap-1 ${
                          isSpeakingThis
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-[#A8A29D] hover:text-[#3C3833] hover:bg-[#F7F6F3]'
                        }`}
                        title={isSpeakingThis ? 'Stop speaking' : 'Listen to spoken voice'}
                        aria-label={isSpeakingThis ? 'Stop speaking' : 'Listen to spoken voice'}
                      >
                        {isSpeakingThis ? (
                          <>
                            <Square className="w-3 h-3 fill-emerald-700" />
                            <span className="text-[10px] font-mono text-emerald-700">Speaking...</span>
                          </>
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div
                    className={`p-5 sm:p-6 ${
                      isUser
                        ? 'rounded-[24px] rounded-br-none bg-[#3C3833] text-white shadow-xs'
                        : `rounded-[24px] rounded-bl-none bg-[#F7F6F3] border ${
                            isSpeakingThis ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-[#EEECE8]'
                          } text-[#4A4743]`
                    }`}
                  >
                    {isUser ? (
                      <p className="text-[16px] sm:text-[17px] leading-relaxed font-sans whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <div className="text-[17px] sm:text-[18px] leading-relaxed font-serif italic text-[#4A4743] space-y-2">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[480px] self-start flex flex-col gap-1.5"
            >
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#A8A29D] ml-2">
                Companion
              </span>
              <div className="p-5 sm:p-6 rounded-[24px] rounded-bl-none bg-[#F7F6F3] border border-[#EEECE8]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#8C8881] animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-[#8C8881] animate-pulse [animation-delay:200ms]" />
                  <div className="w-2 h-2 rounded-full bg-[#8C8881] animate-pulse [animation-delay:400ms]" />
                  <span className="text-xs text-[#8C8881] font-serif italic ml-2">
                    Listening and holding space...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Listening / Dictating Visual Banner */}
        {isListening && (
          <div className="px-6 py-2 bg-[#FAF9F6] border-t border-[#EEECE8] flex items-center justify-between animate-pulse text-xs text-[#3C3833]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-medium">Listening to your voice...</span>
              {interimVoiceText && (
                <span className="text-[#8C8881] italic font-serif truncate max-w-xs sm:max-w-md">
                  "{interimVoiceText}"
                </span>
              )}
            </div>
            <button
              onClick={handleToggleVoiceDictation}
              className="text-[11px] text-rose-700 underline font-medium"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Input Bar with Voice Dictation & Text Input */}
        <div className="p-4 sm:p-8 min-h-[100px] border-t border-[#EEECE8] flex items-center gap-2 sm:gap-4 bg-white">
          <div className="flex-1 h-14 rounded-full bg-[#F7F6F3] border border-[#EEECE8] flex items-center px-4 sm:px-6 focus-within:border-[#A8A29D] transition-colors">
            <input
              ref={inputRef}
              id="input-reflection-message"
              type="text"
              value={input + (interimVoiceText ? ` ${interimVoiceText}` : '')}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isListening ? "Listening to your voice..." : "Continue your reflection or speak aloud..."}
              className="bg-transparent border-none outline-hidden w-full text-base sm:text-lg text-[#3C3833] placeholder-[#A8A29D]"
            />

            {/* Quick Microphone Toggle Button */}
            <button
              id="btn-voice-dictation-chat"
              type="button"
              onClick={handleToggleVoiceDictation}
              className={`p-2 rounded-full transition-all shrink-0 ml-1.5 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                  : 'text-[#8C8881] hover:text-[#3C3833] hover:bg-[#EEECE8]'
              }`}
              title={isListening ? "Turn microphone switch OFF" : "Turn microphone switch ON"}
              aria-label={isListening ? "Turn microphone switch OFF" : "Turn microphone switch ON"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            id="btn-send-reflection"
            onClick={() => handleSendMessage()}
            disabled={(!input.trim() && !interimVoiceText.trim()) || isLoading}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#3C3833] hover:bg-black disabled:opacity-40 flex items-center justify-center text-white transition-all shrink-0 shadow-xs cursor-pointer"
            aria-label="Send reflection"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Aside Atmosphere & Insights Panel */}
      <aside className="w-full lg:w-[360px] xl:w-[400px] flex flex-col p-6 sm:p-10 gap-8 bg-[#FAF9F6] border-t lg:border-t-0 border-[#EEECE8] overflow-y-auto">
        {/* Voice & Microphone Controls Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#EEECE8] flex flex-col gap-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#EEECE8] flex items-center justify-center text-[#3C3833]">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#3C3833]">Spoken Voice Option</span>
                <span className="text-[11px] text-[#8C8881]">
                  {voiceSettings.autoSpeak ? 'Auto-narration Active' : 'On-demand Narration'}
                </span>
              </div>
            </div>
            <button
              onClick={onOpenVoiceSettings}
              className="px-2.5 py-1 rounded-full bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] text-[11px] font-medium border border-[#EEECE8]"
            >
              Configure
            </button>
          </div>

          <div className="pt-2 border-t border-[#F2EFEB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-[#A8A29D]'}`} />
              <span className="text-xs font-medium text-[#4A4743]">Microphone Dictation</span>
            </div>

            <button
              id="btn-microphone-switch-sidebar"
              type="button"
              role="switch"
              aria-checked={isListening}
              onClick={handleToggleVoiceDictation}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                isListening ? 'bg-rose-500' : 'bg-[#D6D3D1] hover:bg-[#C4C1BC]'
              }`}
              title={isListening ? "Turn microphone switch OFF" : "Turn microphone switch ON"}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform shadow-2xs ${
                  isListening ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Atmosphere */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
            Atmosphere
          </h3>
          <div className="flex items-center gap-2.5 text-lg font-medium text-[#3C3833]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#829281] animate-pulse" />
            <span>{selectedEmotion} & Reflective</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {EMOTIONS.map((emo) => (
              <button
                key={emo}
                onClick={() => setSelectedEmotion(emo)}
                className={`px-2.5 py-0.8 rounded-full text-xs transition-all ${
                  selectedEmotion === emo
                    ? 'bg-[#3C3833] text-white font-medium'
                    : 'bg-white text-[#5C5852] hover:bg-[#EEECE8] border border-[#EEECE8]'
                }`}
              >
                {emo}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring Tensions & Patterns */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
              Recurring Tensions
            </h3>
            {messages.length > 0 && !synthesis && (
              <button
                onClick={handleSynthesize}
                disabled={isSynthesizing}
                className="text-[11px] text-[#8C8881] hover:text-[#3C3833] underline"
              >
                {isSynthesizing ? 'Analyzing...' : 'Identify'}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {synthesis ? (
              <>
                {synthesis.identifiedPatterns.map((pattern, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white border border-[#EEECE8] shadow-2xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C8881] mb-1">
                      PATTERN {idx + 1}
                    </div>
                    <div className="text-sm text-[#3C3833] font-medium leading-snug">
                      {pattern}
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-xl bg-white border border-[#EEECE8] shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C8881] mb-1">
                    GROUNDING AFFIRMATION
                  </div>
                  <div className="text-sm italic font-serif text-[#4A4743]">
                    "{synthesis.groundingAffirmation}"
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-white border border-[#EEECE8] shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C8881] mb-1">
                    POLARITY
                  </div>
                  <div className="text-sm text-[#3C3833] font-medium">Solitude vs. Loneliness</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#EEECE8] shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C8881] mb-1">
                    EXPECTATION
                  </div>
                  <div className="text-sm text-[#3C3833] font-medium">Productivity vs. Personal Peace</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Breath Work Module */}
        <div className="mt-auto p-6 rounded-3xl bg-[#E8E6E1] border border-[#D6D3D1] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#3C3833]">
              Breath Work
            </span>
            <span className="text-xs text-[#7E7872] font-mono">4-7-8 RESET</span>
          </div>
          <p className="text-sm text-[#5C5852] leading-snug">
            A moment to reset. Inhale for 4, hold for 7, exhale for 8.
          </p>
          <div className="w-full h-1.5 bg-[#D6D3D1] rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-[#3C3833] rounded-full animate-pulse" />
          </div>
        </div>
      </aside>
    </div>
  );
};
