import React, { useState, useEffect } from 'react';
import { VoiceSettings } from '../types';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Mic, 
  Play, 
  Square,
  Check,
  Settings2
} from 'lucide-react';
import { 
  getAvailableVoices, 
  speakText, 
  stopSpeaking, 
  isCurrentlySpeaking 
} from '../utils/voiceService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [currentSettings, setCurrentSettings] = useState<VoiceSettings>(settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      getAvailableVoices().then((v) => {
        setVoices(v);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAutoSpeak = () => {
    const updated = { ...currentSettings, autoSpeak: !currentSettings.autoSpeak };
    setCurrentSettings(updated);
    onSaveSettings(updated);
  };

  const handleRateChange = (newRate: number) => {
    const updated = { ...currentSettings, rate: newRate };
    setCurrentSettings(updated);
    onSaveSettings(updated);
  };

  const handleVoiceChange = (uri: string) => {
    const chosen = voices.find((v) => v.voiceURI === uri);
    const updated: VoiceSettings = {
      ...currentSettings,
      voiceURI: uri,
      voiceName: chosen?.name || 'Default Voice',
    };
    setCurrentSettings(updated);
    onSaveSettings(updated);
  };

  const handlePlayPreview = () => {
    if (isPlayingPreview) {
      stopSpeaking();
      setIsPlayingPreview(false);
      return;
    }

    const testPhrase =
      'Take a deep breath and settle in. I am here to listen, reflect, and hold space for whatever is on your mind.';
    setIsPlayingPreview(true);
    speakText(
      testPhrase,
      currentSettings,
      () => setIsPlayingPreview(true),
      () => setIsPlayingPreview(false),
      () => setIsPlayingPreview(false)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3C3833]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#FDFCFB] text-[#3C3833] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EEECE8] relative flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-settings-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#EEECE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF9F6] text-[#3C3833] border border-[#EEECE8] flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
                Audio & Spoken Voice
              </span>
              <h2 id="voice-settings-title" className="text-xl font-serif text-[#3C3833]">
                Voice & Narration Settings
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="text-[#8C8881] hover:text-[#3C3833] p-1.5 rounded-full hover:bg-[#F7F6F3] transition-colors"
            aria-label="Close voice settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5">
          {/* Auto-Speak Toggle */}
          <div className="p-4 rounded-2xl bg-white border border-[#EEECE8] flex items-center justify-between shadow-2xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[#3C3833]">
                Auto-Read Reflections Aloud
              </span>
              <span className="text-[11px] text-[#8C8881]">
                Automatically vocalize companion responses when generated
              </span>
            </div>

            <button
              onClick={handleToggleAutoSpeak}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                currentSettings.autoSpeak ? 'bg-[#3C3833]' : 'bg-[#E8E6E1]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  currentSettings.autoSpeak ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Voice Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#3C3833] flex items-center justify-between">
              <span>Companion Voice</span>
              <span className="text-[10px] text-[#8C8881] font-mono">
                {voices.length} voices available
              </span>
            </label>

            <select
              value={currentSettings.voiceURI || ''}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full text-xs text-[#3C3833] bg-[#F7F6F3] border border-[#EEECE8] rounded-xl p-3 focus:outline-hidden focus:border-[#A8A29D]"
            >
              <option value="">System Default (Natural / Warm)</option>
              {voices
                .filter((v) => v.lang.startsWith('en'))
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              {voices
                .filter((v) => !v.lang.startsWith('en'))
                .slice(0, 10)
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
          </div>

          {/* Pacing / Rate Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#3C3833]">Pacing & Speed</span>
              <span className="text-[#8C8881] font-mono">
                {currentSettings.rate.toFixed(2)}x {currentSettings.rate <= 0.9 ? '(Mindful / Calming)' : ''}
              </span>
            </div>

            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={currentSettings.rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full accent-[#3C3833] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8C8881] font-mono">
              <span>0.7x (Serene)</span>
              <span>1.0x (Standard)</span>
              <span>1.3x (Brisk)</span>
            </div>
          </div>

          {/* Spoken Voice Input Note */}
          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#EEECE8] flex items-start gap-2.5">
            <Mic className="w-4 h-4 text-[#829281] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#5C5852] leading-relaxed">
              <strong>Spoken Input:</strong> You can also tap the microphone icon in both the reflection chat and the journal editor to dictate your thoughts aloud effortlessly.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EEECE8]">
          <button
            onClick={handlePlayPreview}
            className="px-4 py-2 rounded-full bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] border border-[#EEECE8] text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            {isPlayingPreview ? (
              <>
                <Square className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                <span>Stop Preview</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#8C8881]" />
                <span>Test Voice Sample</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="px-5 py-2 rounded-full bg-[#3C3833] hover:bg-black text-white text-xs font-medium transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
