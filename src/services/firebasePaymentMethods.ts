import { ref, push, set, get, query, orderByChild, equalTo, remove } from 'firebase/database';
import { db } from './firebase';

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
}

export const paymentMethodsService = {
  async getPaymentMethodsByUser(userId: string): Promise<PaymentMethod[]> {
    try {
      const methodsRef = ref(db, 'paymentMethods');
      const q = query(methodsRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(q);
      
      if (!snapshot.exists()) {
        return [];
      }

      const methods: PaymentMethod[] = [];
      snapshot.forEach((child) => {
        methods.push({
          id: child.key as string,
          ...child.val(),
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
      await remove(methodRef);
    } catch (error) {
      console.error('Error deleting payment method:', error);
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
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  },
};
