import { ref, push, set, get, remove, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from './firebase';
import type { Message } from '../store/slices/chatSlice';

export const chatService = {
  // Get all messages
  async getMessages(): Promise<Message[]> {
    try {
      const messagesRef = ref(db, 'messages');
      const q = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
      const snapshot = await get(q);
      
      if (!snapshot.exists()) return [];
      
      const messages: Message[] = [];
      snapshot.forEach((child) => {
        if (child.key) {
          messages.push({ id: child.key, ...child.val() } as Message);
        }
      });
      
      return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Send a message
  async sendMessage(userId: string, userEmail: string, text: string): Promise<Message> {
    try {
      if (!text.trim()) throw new Error('Message text cannot be empty');
      const messagesRef = ref(db, 'messages');
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

  // Subscribe to messages
  subscribeToMessages(callback: (messages: Message[]) => void) {
    try {
      const messagesRef = ref(db, 'messages');
      const q = query(messagesRef, orderByChild('timestamp'), limitToLast(100));
      
      const unsubscribe = onValue(q, (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }
        
        const messages: Message[] = [];
        snapshot.forEach((child) => {
          if (child.key) {
            messages.push({ id: child.key, ...child.val() } as Message);
          }
        });
        
        callback(messages);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      throw error;
    }
  },

  // Delete a message
  async deleteMessage(id: string): Promise<void> {
    try {
      if (!id) throw new Error('Message ID is required');
      const messageRef = ref(db, `messages/${id}`);
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
