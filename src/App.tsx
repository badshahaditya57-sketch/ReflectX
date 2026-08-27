/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, ChatMessage, EmotionCategory, JournalEntry, VoiceSettings } from './types';
import {
  getSavedJournalEntries,
  saveJournalEntries,
  getSavedChatHistory,
  saveChatHistory,
} from './utils/storage';
import {
  fetchUserJournalEntries,
  saveUserJournalEntry,
  deleteUserJournalEntry,
  saveUserChatSession,
  syncUserProfile,
} from './utils/firestoreService';
import {
  getSavedVoiceSettings,
  saveVoiceSettings,
  DEFAULT_VOICE_SETTINGS,
} from './utils/voiceService';
import { auth, googleProvider } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { ReflectionChat } from './components/ReflectionChat';
import { JournalEditor } from './components/JournalEditor';
import { JournalArchive } from './components/JournalArchive';
import { PromptExplorer } from './components/PromptExplorer';
import { CrisisModal } from './components/CrisisModal';
import { BreathingModal } from './components/BreathingModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('reflect');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionCategory>('Grounded');
  const [initialJournalPrompt, setInitialJournalPrompt] = useState<string | undefined>(undefined);

  // Spoken Voice Settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Firebase Auth & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);

  // Initialize data on mount from local storage
  useEffect(() => {
    const loadedEntries = getSavedJournalEntries();
    setJournalEntries(loadedEntries);

    const loadedChat = getSavedChatHistory();
    setChatMessages(loadedChat);

    const savedVoice = getSavedVoiceSettings();
    setVoiceSettings(savedVoice);
  }, []);

  const handleSaveVoiceSettings = (updated: VoiceSettings) => {
    setVoiceSettings(updated);
    saveVoiceSettings(updated);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        try {
          await syncUserProfile(user.uid, user.email, user.displayName);
          const remoteEntries = await fetchUserJournalEntries(user.uid);
          
          if (remoteEntries.length > 0) {
            setJournalEntries((prev) => {
              // Merge local and remote
              const merged = [
                ...remoteEntries,
                ...prev.filter((p) => !remoteEntries.some((r) => r.id === p.id)),
              ];
              saveJournalEntries(merged);
              return merged;
            });
          } else {
            // Upload current local entries to Firestore
            const currentLocal = getSavedJournalEntries();
            for (const entry of currentLocal) {
              await saveUserJournalEntry(user.uid, entry);
            }
          }
        } catch (err) {
          console.error('Failed to sync with Firestore:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync journal entries to local storage
  useEffect(() => {
    if (journalEntries.length > 0) {
      saveJournalEntries(journalEntries);
    }
  }, [journalEntries]);

  // Sync chat history to local storage & Firestore if signed in
  useEffect(() => {
    if (chatMessages.length > 0) {
      saveChatHistory(chatMessages);
      if (currentUser) {
        saveUserChatSession(currentUser.uid, 'active-session', chatMessages, selectedEmotion);
      }
    }
  }, [chatMessages, currentUser, selectedEmotion]);

  // Save new or updated entry
  const handleSaveEntry = async (entry: JournalEntry) => {
    setJournalEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      let updated: JournalEntry[];
      if (exists) {
        updated = prev.map((e) => (e.id === entry.id ? entry : e));
      } else {
        updated = [entry, ...prev];
      }
      saveJournalEntries(updated);
      return updated;
    });
    setSelectedEntry(entry);

    if (currentUser) {
      setIsSyncing(true);
      try {
        await saveUserJournalEntry(currentUser.uid, entry);
      } catch (err) {
        console.error('Error saving to Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Delete entry
  const handleDeleteEntry = async (id: string) => {
    setJournalEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveJournalEntries(updated);
      return updated;
    });
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }

    if (currentUser) {
      setIsSyncing(true);
      try {
        await deleteUserJournalEntry(currentUser.uid, id);
      } catch (err) {
        console.error('Error deleting from Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Import entries
  const handleImportEntries = async (newEntries: JournalEntry[]) => {
    setJournalEntries((prev) => {
      const merged = [...newEntries, ...prev.filter((p) => !newEntries.some((n) => n.id === p.id))];
      saveJournalEntries(merged);
      return merged;
    });

    if (currentUser) {
      setIsSyncing(true);
      try {
        for (const entry of newEntries) {
          await saveUserJournalEntry(currentUser.uid, entry);
        }
      } catch (err) {
        console.error('Error syncing imported entries to Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Save dialogue from chat directly into journal
  const handleSaveChatToJournal = (
    title: string,
    content: string,
    mood: EmotionCategory,
    companionReflection?: string
  ) => {
    const newEntry: JournalEntry = {
      id: `chat-entry-${Date.now()}`,
      title,
      content,
      mood,
      date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companionReflection,
      wordCount: content.split(/\s+/).length,
    };
    handleSaveEntry(newEntry);
  };

  // Prompt actions
  const handlePromptForJournal = (promptText: string) => {
    setSelectedEntry(null);
    setInitialJournalPrompt(promptText);
    setActiveTab('journal');
  };

  const handlePromptForChat = (promptText: string) => {
    setActiveTab('reflect');
    // Pre-populate chat or trigger message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
      emotionTag: selectedEmotion,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    
    // Trigger companion response
    fetch('/api/chat/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: promptText }],
        currentEmotion: selectedEmotion,
        prompt: promptText,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.reply) {
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, assistantMsg]);
        }
      })
      .catch((err) => console.error('Error fetching companion response:', err));
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Firebase Auth sign-in error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase Auth sign-out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#3C3833] font-sans selection:bg-[#E8E6E1] selection:text-[#3C3833] flex flex-col">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'journal' && activeTab !== 'journal') {
            setInitialJournalPrompt(undefined);
          }
          setActiveTab(tab);
        }}
        onOpenCrisisModal={() => setIsCrisisModalOpen(true)}
        onOpenBreathingModal={() => setIsBreathingModalOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        voiceSettings={voiceSettings}
        entryCount={journalEntries.length}
        user={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSyncing={isSyncing}
      />

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'reflect' && (
          <ReflectionChat
            messages={chatMessages}
            setMessages={setChatMessages}
            onSaveToJournal={handleSaveChatToJournal}
            onOpenCrisisModal={() => setIsCrisisModalOpen(true)}
            selectedEmotion={selectedEmotion}
            setSelectedEmotion={setSelectedEmotion}
            voiceSettings={voiceSettings}
            onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
          />
        )}

        {activeTab === 'journal' && (
          <JournalEditor
            currentEntry={selectedEntry}
            onSaveEntry={handleSaveEntry}
            onNewEntry={() => {
              setSelectedEntry(null);
              setInitialJournalPrompt(undefined);
            }}
            initialPrompt={initialJournalPrompt}
            voiceSettings={voiceSettings}
            onOpenVoiceSettings={() => setIsVoiceModalOpen(true)}
          />
        )}

        {activeTab === 'archive' && (
          <JournalArchive
            entries={journalEntries}
            onSelectEntry={(entry) => {
              setSelectedEntry(entry);
              setActiveTab('journal');
            }}
            onDeleteEntry={handleDeleteEntry}
            onImportEntries={handleImportEntries}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptExplorer
            onSelectForJournal={handlePromptForJournal}
            onSelectForChat={handlePromptForChat}
          />
        )}
      </main>

      {/* Modals */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        settings={voiceSettings}
        onSaveSettings={handleSaveVoiceSettings}
      />

      <CrisisModal
        isOpen={isCrisisModalOpen}
        onClose={() => setIsCrisisModalOpen(false)}
      />

      <BreathingModal
        isOpen={isBreathingModalOpen}
        onClose={() => setIsBreathingModalOpen(false)}
      />
    </div>
  );
}
