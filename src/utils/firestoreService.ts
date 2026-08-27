import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalEntry, ChatMessage } from '../types';
import { sanitizePayload } from './storage';

/**
 * Fetch all journal entries from Firestore for a specific user
 */
export async function fetchUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  try {
    const entriesRef = collection(db, 'users', userId, 'journalEntries');
    const q = query(entriesRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        title: data.title || '',
        content: data.content || '',
        mood: data.mood || 'Grounded',
        date: data.date || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        companionReflection: data.companionReflection || undefined,
        synthesis: data.synthesis || undefined,
        wordCount: data.wordCount || 0,
      });
    });
    return entries;
  } catch (error) {
    console.error('Error fetching Firestore journal entries:', error);
    throw error;
  }
}

/**
 * Save or update a journal entry in Firestore
 */
export async function saveUserJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  try {
    const entryRef = doc(db, 'users', userId, 'journalEntries', entry.id);
    const sanitized = sanitizePayload({
      ...entry,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(entryRef, sanitized, { merge: true });
  } catch (error) {
    console.error('Error saving Firestore journal entry:', error);
    throw error;
  }
}

/**
 * Delete a journal entry from Firestore
 */
export async function deleteUserJournalEntry(userId: string, entryId: string): Promise<void> {
  try {
    const entryRef = doc(db, 'users', userId, 'journalEntries', entryId);
    await deleteDoc(entryRef);
  } catch (error) {
    console.error('Error deleting Firestore journal entry:', error);
    throw error;
  }
}

/**
 * Save chat session in Firestore
 */
export async function saveUserChatSession(
  userId: string, 
  sessionId: string, 
  messages: ChatMessage[], 
  selectedEmotion: string
): Promise<void> {
  try {
    const sessionRef = doc(db, 'users', userId, 'chatSessions', sessionId);
    const sanitized = sanitizePayload({
      id: sessionId,
      userId,
      messages,
      selectedEmotion,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(sessionRef, sanitized, { merge: true });
  } catch (error) {
    console.error('Error saving Firestore chat session:', error);
  }
}

/**
 * Update user profile in Firestore
 */
export async function syncUserProfile(userId: string, email?: string | null, displayName?: string | null): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      id: userId,
      email: email || null,
      displayName: displayName || null,
      lastActiveAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing user profile:', error);
  }
}
