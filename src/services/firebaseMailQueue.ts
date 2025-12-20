import { ref, push, set } from 'firebase/database';
import { db } from './firebase';

export const mailQueue = {
  async enqueueMail(to: string, subject: string, html: string) {
    try {
      const q = ref(db, 'mailQueue');
      const newRef = push(q);
      await set(newRef, { to, subject, html, createdAt: new Date().toISOString(), status: 'pending' });
      return true;
    } catch (error) {
      console.error('❌ Error enqueueing mail:', error);
      return false;
    }
  }
};
