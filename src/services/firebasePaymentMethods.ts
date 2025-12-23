import { ref, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank_account';
  brand?: string; // VISA, Mastercard, AMEX, etc.
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string; // Stripe payment method ID for actual processing
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export const paymentMethodsService = {
  async getPaymentMethodsByUser(userId: string, includeDeleted = false): Promise<PaymentMethod[]> {
    try {
      const methodsRef = ref(db, 'paymentMethods');
      const q = query(methodsRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(q);
      
      if (!snapshot.exists()) {
        return [];
      }

      const methods: PaymentMethod[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        // skip soft-deleted methods unless caller asked to include them
        if (val && val.deleted && !includeDeleted) return;
        methods.push({
          id: child.key as string,
          ...val,
        });
      });

      return methods;
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  },

  async createPaymentMethod(
    userId: string,
    type: 'card' | 'bank_account',
    last4: string,
    brand?: string,
    expMonth?: number,
    expYear?: number,
    stripePaymentMethodId?: string
  ): Promise<PaymentMethod> {
    try {
      const methodsRef = ref(db, 'paymentMethods');
      const newRef = push(methodsRef);
      
      // Check if this is the first payment method for user (make it default)
      const existingMethods = await this.getPaymentMethodsByUser(userId);
      const isDefault = existingMethods.length === 0;
      
      const method: Omit<PaymentMethod, 'id'> = {
        userId,
        type,
        brand,
        last4,
        isDefault,
        createdAt: new Date().toISOString(),
      };

      // Only add optional fields if they're defined
      if (expMonth !== undefined) method.expMonth = expMonth;
      if (expYear !== undefined) method.expYear = expYear;
      if (stripePaymentMethodId !== undefined) method.stripePaymentMethodId = stripePaymentMethodId;

      await set(newRef, method);

      try {
        await auditLogService.log({
          action: 'paymentMethod.created',
          entityType: 'other',
          entityId: newRef.key ?? null,
          details: { userId, type, brand, last4, isDefault },
        });
      } catch (e) {
        console.error('Error auditing paymentMethod.created:', e);
      }

      return {
        id: newRef.key as string,
        ...method,
      };
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  },

  async deletePaymentMethod(id: string): Promise<void> {
    try {
      const methodRef = ref(db, `paymentMethods/${id}`);
      const now = new Date().toISOString();
      const snap = await get(methodRef);
      const before = snap.exists() ? snap.val() : null;
      await set(methodRef, {
        ...(before || {}),
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
      try {
        await auditLogService.logDelete('other', id, before);
      } catch (e) {
        console.error('Error auditing paymentMethod.delete:', e);
      }
    } catch (error) {
      console.error('Error deleting paymentMethod:', error);
      throw error;
    }
  },

  async restorePaymentMethod(id: string): Promise<string | null> {
    try {
      const methodRef = ref(db, `paymentMethods/${id}`);
      const snap = await get(methodRef);
      const before = snap.exists() ? snap.val() : null;
      const now = new Date().toISOString();

      // Remove deleted flag and deletedAt, update updatedAt
      const updated = {
        ...(before || {}),
        deleted: false,
        deletedAt: null,
        updatedAt: now,
      } as any;

      await set(methodRef, updated);

      try {
        const auditId = await auditLogService.log({
          action: 'paymentMethod.restored',
          entityType: 'other',
          entityId: id,
          details: { before },
        });
        return auditId ?? null;
      } catch (e) {
        console.error('Error auditing paymentMethod.restored:', e);
        return null;
      }
    } catch (error) {
      console.error('Error restoring paymentMethod:', error);
      throw error;
    }
  },

  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<void> {
    try {
      // First, unset all defaults for this user
      const methods = await this.getPaymentMethodsByUser(userId);
      
      for (const method of methods) {
        const methodRef = ref(db, `paymentMethods/${method.id}`);
        await set(methodRef, {
          ...method,
          isDefault: method.id === methodId,
          updatedAt: new Date().toISOString(),
        });
        try {
          await auditLogService.log({
            action: method.id === methodId ? 'paymentMethod.set_default' : 'paymentMethod.unset_default',
            entityType: 'other',
            entityId: method.id,
            details: { userId, methodId: method.id },
          });
        } catch (e) {
          console.error(`Error auditing ${method.id === methodId ? 'paymentMethod.set_default' : 'paymentMethod.unset_default'}:`, e);
        }
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  },
};
