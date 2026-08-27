import React from 'react';
import { User } from 'firebase/auth';
import { Cloud, CloudOff, LogIn, LogOut, CheckCircle2 } from 'lucide-react';

interface AuthStatusProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
}

export const AuthStatus: React.FC<AuthStatusProps> = ({
  user,
  onSignIn,
  onSignOut,
  isSyncing,
}) => {
  if (!user) {
    return (
      <button
        onClick={onSignIn}
        className="px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#EEECE8] hover:bg-[#F7F6F3] text-[#4A4743] hover:text-[#3C3833] transition-all flex items-center gap-1.5 text-xs font-medium"
        title="Sign in with Google to sync your reflections to Cloud Firestore"
      >
        <LogIn className="w-3.5 h-3.5 text-[#8C8881]" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F6F3] border border-[#EEECE8] text-[11px] text-[#4A4743]"
        title={`Connected to Firestore as ${user.email || user.displayName}`}
      >
        {isSyncing ? (
          <Cloud className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
        )}
        <span className="hidden md:inline max-w-[100px] truncate">
          {user.displayName || user.email?.split('@')[0] || 'Syncing'}
        </span>
      </div>

      <button
        onClick={onSignOut}
        className="p-1.5 rounded-full text-[#8C8881] hover:text-[#3C3833] hover:bg-[#F7F6F3] transition-colors"
        title="Sign Out"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
