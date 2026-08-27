import React from 'react';
import { X, PhoneCall, MessageSquare, ShieldAlert, ExternalLink, Globe } from 'lucide-react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3C3833]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#FDFCFB] text-[#3C3833] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-[#EEECE8] relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crisis-title"
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FAF9F6] text-[#3C3833] border border-[#EEECE8] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#A8A29D]">
                Immediate Support
              </span>
              <h2 id="crisis-title" className="text-xl font-serif text-[#3C3833]">
                You Are Not Alone
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C8881] hover:text-[#3C3833] p-1.5 rounded-full hover:bg-[#F7F6F3] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#5C5852] leading-relaxed mb-6">
          This reflection partner is a gentle mirror for self-exploration and journaling, but it is not equipped for clinical emergencies or acute distress. If you are experiencing overwhelming emotional pain, thoughts of self-harm, or need someone to talk to right now, please reach out to trained support:
        </p>

        <div className="space-y-3 mb-6">
          {/* US/Canada 988 */}
          <div className="p-4 rounded-2xl bg-white border border-[#EEECE8] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-[#3C3833] shrink-0" />
              <div>
                <div className="font-semibold text-xs text-[#3C3833]">
                  988 Suicide & Crisis Lifeline
                </div>
                <div className="text-[11px] text-[#8C8881]">
                  Call or text <strong>988</strong> (US & Canada, 24/7 Free)
                </div>
              </div>
            </div>
            <a
              href="tel:988"
              className="px-3.5 py-1.5 bg-[#3C3833] hover:bg-black text-white text-xs font-medium rounded-full shadow-2xs transition-colors shrink-0"
            >
              Call 988
            </a>
          </div>

          {/* Crisis Text Line */}
          <div className="p-4 rounded-2xl bg-white border border-[#EEECE8] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-[#3C3833] shrink-0" />
              <div>
                <div className="font-semibold text-xs text-[#3C3833]">
                  Crisis Text Line
                </div>
                <div className="text-[11px] text-[#8C8881]">
                  Text <strong>HOME</strong> to <strong>741741</strong> (US, UK, Canada)
                </div>
              </div>
            </div>
            <a
              href="sms:741741"
              className="px-3.5 py-1.5 bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] border border-[#EEECE8] text-xs font-medium rounded-full transition-colors shrink-0"
            >
              Text Now
            </a>
          </div>

          {/* International Resources */}
          <div className="p-4 rounded-2xl bg-white border border-[#EEECE8] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#829281] shrink-0" />
              <div>
                <div className="font-semibold text-xs text-[#3C3833]">
                  International Find-A-Helpline
                </div>
                <div className="text-[11px] text-[#8C8881]">
                  Free, confidential support directory in your country
                </div>
              </div>
            </div>
            <a
              href="https://findahelpline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[#8C8881] hover:text-[#3C3833] rounded-full hover:bg-[#F7F6F3] transition-colors shrink-0"
              title="Visit findahelpline.com"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#F7F6F3] hover:bg-[#EEECE8] text-[#3C3833] text-xs font-medium rounded-full transition-colors border border-[#EEECE8]"
          >
            Return to Reflection
          </button>
        </div>
      </div>
    </div>
  );
};
