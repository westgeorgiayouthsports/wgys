import { ref, push, set, get, remove, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from './firebase';
import type { Message } from '../store/slices/chatSlice';

type MessageCallback = (messages: Message[]) => void;

export const chatService = {
  // Build path for messages; if teamId provided, scope under teamChats/{teamId}/messages
  _messagesPath(teamId?: string) {
    return teamId ? `teamChats/${teamId}/messages` : 'messages';
  },

  // Get messages (optionally for a team)
  async getMessages(teamId?: string): Promise<Message[]> {
    try {
      const path = this._messagesPath(teamId);
      const messagesRef = ref(db, path);
      const q = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
      const snapshot = await get(q);

      if (!snapshot.exists()) return [];

      const fetchedMessages: Message[] = [];
      snapshot.forEach((child) => {
        if (child.key) {
          fetchedMessages.push({ id: child.key, ...child.val() } as Message);
        }
      });

      return fetchedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send a message (optionally scoped to a team)
  async sendMessage(userId: string, userEmail: string, text: string, teamId?: string): Promise<Message> {
    try {
      if (!text.trim()) throw new Error('Message text cannot be empty');
      const path = this._messagesPath(teamId);
      const messagesRef = ref(db, path);
      let newMessageRef;
      try {
        newMessageRef = push(messagesRef);
      } catch (pushError) {
        throw new Error('Failed to create message reference: ' + (pushError as Error).message);
      }
      const timestamp = new Date().toISOString();

      const message = {
        userId,
        userEmail,
        text,
        timestamp,
        read: false,
      };

      try {
        await set(newMessageRef, message);
      } catch (setError) {
        throw new Error('Failed to save message to database: ' + (setError as Error).message);
      }

      return {
        id: newMessageRef.key,
        userId,
        userEmail,
        text,
        timestamp,
        read: false,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Subscribe to messages (optionally for a team)
  subscribeToMessages(callback: MessageCallback, teamId?: string) {
    try {
      const path = this._messagesPath(teamId);
      const messagesRef = ref(db, path);
      const q = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

      const unsubscribe = onValue(q, (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }

        const collectedMessages: Message[] = [];
        snapshot.forEach((child) => {
          if (child.key) {
            collectedMessages.push({ id: child.key, ...child.val() } as Message);
          }
        });

        callback(collectedMessages);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      throw error;
    }
  },

  // Delete a message (optionally scoped to a team)
  async deleteMessage(id: string, teamId?: string): Promise<void> {
    try {
      if (!id) throw new Error('Message ID is required');
      const path = this._messagesPath(teamId);
      const messageRef = ref(db, `${path}/${id}`);
      try {
        await remove(messageRef);
      } catch (removeError) {
        throw new Error('Failed to delete message from database: ' + (removeError as Error).message);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },
};
