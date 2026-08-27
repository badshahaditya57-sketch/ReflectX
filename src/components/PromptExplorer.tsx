import React, { useState } from 'react';
import { ReflectionPrompt } from '../types';
import { 
  Sparkles, 
  BookOpen, 
  MessageSquareHeart, 
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';

interface PromptExplorerProps {
  onSelectForJournal: (promptText: string) => void;
  onSelectForChat: (promptText: string) => void;
}

const STATIC_THEMES = [
  'Navigating Decisions',
  'Untangling Emotions',
  'Relationships & Boundaries',
  'Inner Critic & Self-Compassion',
  'Transitions & Beginnings',
  'Unwinding at Day’s End',
];

const CURATED_PROMPTS: ReflectionPrompt[] = [
  {
    id: 'c-1',
    theme: 'Navigating Decisions',
    prompt: 'What outcome are you secretly dreading, and what would it mean if that exact fear came true?',
    subtext: 'Deconstruct catastrophizing by facing the underlying core assumption.',
    category: 'decisions',
  },
  {
    id: 'c-2',
    theme: 'Navigating Decisions',
    prompt: 'If no one whose opinion you worry about could judge your choice, what would your body naturally move toward?',
    subtext: 'Isolating your authentic intuition from external social validation.',
    category: 'decisions',
  },
  {
    id: 'c-3',
    theme: 'Untangling Emotions',
    prompt: 'What is a feeling you have been labeling as "bad" or "unproductive" this week?',
    subtext: 'Reclaiming rejected emotions with curiosity rather than reprimand.',
    category: 'emotions',
  },
  {
    id: 'c-4',
    theme: 'Untangling Emotions',
    prompt: 'Where in your physical body is your current stress asking to be held or heard?',
    subtext: 'Connecting somatic sensations to unexpressed mental tension.',
    category: 'emotions',
  },
  {
    id: 'c-5',
    theme: 'Relationships & Boundaries',
    prompt: 'Where in your life are you currently saying "yes" with your mouth while saying "no" in your gut?',
    subtext: 'Gently mapping the boundaries that have become porous.',
    category: 'relationships',
  },
  {
    id: 'c-6',
    theme: 'Inner Critic & Self-Compassion',
    prompt: 'Whose voice does your harshest self-critic sound like, and when did you first start believing them?',
    subtext: 'Separating your inherent worth from inherited internal dialogues.',
    category: 'growth',
  },
  {
    id: 'c-7',
    theme: 'Transitions & Beginnings',
    prompt: 'What part of your old routine or identity is asking to be honored and released?',
    subtext: 'Giving closure to previous seasons so new ones have room to take root.',
    category: 'growth',
  },
  {
    id: 'c-8',
    theme: 'Unwinding at Day’s End',
    prompt: 'What did you carry today that was never yours to carry in the first place?',
    subtext: 'Unloading borrowed burdens before restful sleep.',
    category: 'clarity',
  },
];

export const PromptExplorer: React.FC<PromptExplorerProps> = ({
  onSelectForJournal,
  onSelectForChat,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string>(STATIC_THEMES[0]);
  const [aiPrompts, setAiPrompts] = useState<ReflectionPrompt[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Generate dynamic Socratic prompts via Gemini
  const handleGenerateAiPrompts = async (themeName: string) => {
    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/journal/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeName }),
      });

      if (!response.ok) throw new Error('Could not fetch prompts');
      const data = await response.json();
      if (Array.isArray(data.prompts)) {
        setAiPrompts(data.prompts);
      }
    } catch (err) {
      console.error('Error generating prompts:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const displayedCurated = CURATED_PROMPTS.filter(
    (p) => p.theme.toLowerCase() === selectedTheme.toLowerCase()
  );

  return (
    <div className="flex-1 bg-[#FDFCFB] overflow-y-auto px-4 sm:px-10 py-8 pb-24">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
              Socratic Inquiries
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#3C3833] mt-1">
              Curated Prompts
            </h2>
          </div>

          <button
            id="btn-generate-ai-prompts"
            onClick={() => handleGenerateAiPrompts(selectedTheme)}
            disabled={isLoadingAi}
            className="px-4 py-2 rounded-full bg-[#3C3833] hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-2 shadow-2xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D6D3D1]" />
            <span>{isLoadingAi ? 'Crafting Inquiries...' : `Generate for "${selectedTheme}"`}</span>
          </button>
        </div>

        {/* Theme Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {STATIC_THEMES.map((theme) => (
            <button
              key={theme}
              onClick={() => {
                setSelectedTheme(theme);
                setAiPrompts([]);
              }}
              className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all ${
                selectedTheme === theme
                  ? 'bg-[#3C3833] text-white font-medium shadow-xs'
                  : 'bg-white hover:bg-[#F7F6F3] text-[#5C5852] border border-[#EEECE8]'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>

        {/* Dynamic AI Prompts if generated */}
        {aiPrompts.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
                Fresh Inquiries for {selectedTheme}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {aiPrompts.map((p, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FAF9F6] border border-[#EEECE8] rounded-3xl p-6 sm:p-7 shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <p className="font-serif text-lg sm:text-xl text-[#3C3833] mb-2 leading-relaxed">
                      "{p.prompt}"
                    </p>
                    <p className="text-xs text-[#8C8881] mb-5 font-sans">
                      {p.subtext}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-[#EEECE8]">
                    <button
                      onClick={() => onSelectForJournal(p.prompt)}
                      className="px-4 py-2 bg-[#3C3833] hover:bg-black text-white rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Write in Journal</span>
                    </button>

                    <button
                      onClick={() => onSelectForChat(p.prompt)}
                      className="px-4 py-2 bg-white hover:bg-[#F7F6F3] text-[#3C3833] border border-[#EEECE8] rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <MessageSquareHeart className="w-3.5 h-3.5 text-[#8C8881]" />
                      <span>Explore with Companion</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Curated Prompts */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
              Essential Inquiries ({displayedCurated.length})
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {displayedCurated.map((prompt) => (
              <div
                key={prompt.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EEECE8] shadow-2xs hover:border-[#D6D3D1] transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C8881] bg-[#F7F6F3] px-2.5 py-1 rounded-full border border-[#EEECE8] inline-block mb-3">
                    {prompt.theme}
                  </span>

                  <h4 className="font-serif text-lg sm:text-xl text-[#3C3833] leading-relaxed mb-2">
                    "{prompt.prompt}"
                  </h4>

                  <p className="text-xs text-[#8C8881] leading-relaxed mb-5">
                    {prompt.subtext}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-[#EEECE8]">
                  <button
                    onClick={() => onSelectForJournal(prompt.prompt)}
                    className="px-4 py-2 bg-[#3C3833] hover:bg-black text-white rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Journal on This</span>
                  </button>

                  <button
                    onClick={() => onSelectForChat(prompt.prompt)}
                    className="px-4 py-2 bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5 text-[#8C8881]" />
                    <span>Reflect with Mirror</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
