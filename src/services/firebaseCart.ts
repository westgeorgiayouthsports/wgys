import { ref, set, get } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';

export const firebaseCartService = {
  async saveCart(userId: string, items: any[]) {
    try {
      const now = new Date().toISOString();
      const cartRef = ref(db, `carts/${userId}`);
      const payload = { userId, items, updatedAt: now };
      await set(cartRef, payload);
      try {
        await auditLogService.log({ action: 'cart.saved', entityType: 'other', entityId: userId, details: { itemsCount: items?.length || 0 } });
      } catch (e) {
        console.error('Error auditing cart.save:', e);
      }
      return true;
    } catch (error) {
      console.error('Error saving cart to database:', error);
      return false;
    }
  },

  async getCart(userId: string) {
    try {
      const snap = await get(ref(db, `carts/${userId}`));
      if (!snap.exists()) return null;
      const data = snap.val();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching cart from database:', error);
      return null;
    }
  },

  async clearCart(userId: string) {
    try {
      await set(ref(db, `carts/${userId}`), null);
      try {
        await auditLogService.log({ action: 'cart.cleared', entityType: 'other', entityId: userId, details: {} });
      } catch (e) {
        console.error('Error auditing cart.clear:', e);
      }
      return true;
    } catch (error) {
      console.error('Error clearing cart in database:', error);
      return false;
    }
  }
};

export default firebaseCartService;
