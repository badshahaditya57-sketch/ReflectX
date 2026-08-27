import React from 'react';
import { ActiveTab, VoiceSettings } from '../types';
import { MessageSquareHeart, BookOpen, Library, Compass, HeartHandshake, Wind, Volume2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { AuthStatus } from './AuthStatus';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCrisisModal: () => void;
  onOpenBreathingModal: () => void;
  onOpenVoiceModal: () => void;
  voiceSettings: VoiceSettings;
  entryCount: number;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCrisisModal,
  onOpenBreathingModal,
  onOpenVoiceModal,
  voiceSettings,
  entryCount,
  user,
  onSignIn,
  onSignOut,
  isSyncing,
}) => {
  const todayDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="border-b border-[#EEECE8] bg-[#FDFCFB]/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[76px] sm:h-[80px]">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#A8A29D] to-[#D6D3D1] shadow-2xs shrink-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/70" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-medium tracking-tight text-xl text-[#3C3833]">
                ReflectX
              </span>
              <span className="hidden md:inline-block text-[11px] text-[#8C8881] uppercase tracking-[0.2em] font-semibold">
                Reflection Companion
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="nav-tab-reflect"
              onClick={() => setActiveTab('reflect')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'reflect'
                  ? 'bg-[#3C3833] text-white shadow-xs'
                  : 'text-[#5C5852] hover:text-[#3C3833] hover:bg-[#F7F6F3]'
              }`}
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Partner</span>
            </button>

            <button
              id="nav-tab-journal"
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'journal'
                  ? 'bg-[#3C3833] text-white shadow-xs'
                  : 'text-[#5C5852] hover:text-[#3C3833] hover:bg-[#F7F6F3]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Journal</span>
            </button>

            <button
              id="nav-tab-archive"
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'archive'
                  ? 'bg-[#3C3833] text-white shadow-xs'
                  : 'text-[#5C5852] hover:text-[#3C3833] hover:bg-[#F7F6F3]'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Archive</span>
              {entryCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                    activeTab === 'archive'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#EEECE8] text-[#5C5852]'
                  }`}
                >
                  {entryCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-prompts"
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                activeTab === 'prompts'
                  ? 'bg-[#3C3833] text-white shadow-xs'
                  : 'text-[#5C5852] hover:text-[#3C3833] hover:bg-[#F7F6F3]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Inquiries</span>
            </button>
          </nav>

          {/* Metadata, Auth & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center gap-4 text-xs uppercase tracking-[0.2em] font-semibold text-[#8C8881]">
              <span>{todayDate}</span>
              <div className="w-px h-3.5 bg-[#EEECE8]" />
            </div>

            {/* Spoken Voice Option Button */}
            <button
              id="btn-nav-voice"
              onClick={onOpenVoiceModal}
              title="Spoken Voice & Narration Options"
              className={`px-3 py-2 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${
                voiceSettings.autoSpeak
                  ? 'bg-[#3C3833] text-white border-[#3C3833] shadow-2xs'
                  : 'bg-[#FAF9F6] border-[#EEECE8] hover:bg-[#F7F6F3] text-[#4A4743] hover:text-[#3C3833]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {voiceSettings.autoSpeak ? 'Voice On' : 'Voice'}
              </span>
            </button>

            {/* Firebase Auth & Firestore Sync */}
            <AuthStatus
              user={user}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              isSyncing={isSyncing}
            />

            <div className="flex items-center gap-1.5">
              <button
                id="btn-breathing-modal"
                onClick={onOpenBreathingModal}
                title="Grounding breath exercise (4-7-8)"
                className="px-3 py-2 rounded-full bg-[#FAF9F6] border border-[#EEECE8] hover:bg-[#F7F6F3] text-[#4A4743] hover:text-[#3C3833] transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <Wind className="w-3.5 h-3.5 text-[#829281]" />
                <span className="hidden sm:inline">Breathe</span>
              </button>

              <button
                id="btn-crisis-support"
                onClick={onOpenCrisisModal}
                title="Support & Crisis Hotlines"
                className="px-3 py-2 rounded-full text-[#8C8881] hover:text-[#3C3833] hover:bg-[#F7F6F3] transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
