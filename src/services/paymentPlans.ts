import { ref, push, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import { PaymentPlan } from '../types/paymentPlan';

export const paymentPlansService = {
  async getPaymentPlans(): Promise<PaymentPlan[]> {
    try {
      const snap = await get(ref(db, 'paymentPlans'));
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, p]: [string, any]) => ({ id, ...(p as any) } as PaymentPlan));
    } catch (e) {
      console.error('Error fetching payment plans', e);
      const code = (e as any)?.code || '';
      const msg = (e as any)?.message || String(e || '');
      // If permission denied, rethrow so callers can surface a user-visible error
      if (code === 'PERMISSION_DENIED' || msg.toLowerCase().includes('permission')) {
        throw e;
      }
      return [];
    }
  },

  async getPaymentPlanById(id: string): Promise<PaymentPlan | null> {
    try {
      const snap = await get(ref(db, `paymentPlans/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() as any) } as PaymentPlan;
    } catch (e) {
      console.error('Error fetching payment plan', e);
      return null;
    }
  },

  async createPaymentPlan(plan: Partial<PaymentPlan>, createdBy?: string): Promise<string | null> {
    try {
      const plansRef = ref(db, 'paymentPlans');
      const now = new Date().toISOString();
      const cleaned = Object.fromEntries(Object.entries(plan || {}).filter(([_, v]) => v !== undefined && v !== ''));
      const payload = { ...cleaned, createdAt: now, updatedAt: now, createdBy: createdBy || null };
      const res = await push(plansRef, payload);
      try { await auditLogService.log({ action: 'paymentPlan.created', entityType: AuditEntity.PaymentPlan, entityId: res.key, details: payload }); } catch (error) { console.error("Error auditing paymentPlan.created", error); }
      return res.key;
    } catch (e) {
      console.error('Error creating payment plan', e);
      throw e;
    }
  },

  async updatePaymentPlan(id: string, updates: Partial<PaymentPlan>) {
    try {
      const planRef = ref(db, `paymentPlans/${id}`);
      const cleaned = Object.fromEntries(Object.entries(updates || {}).filter(([_, v]) => v !== undefined && v !== ''));
      const payload = { ...cleaned, updatedAt: new Date().toISOString() };
      await update(planRef, payload as any);
      try { await auditLogService.log({ action: 'paymentPlan.updated', entityType: AuditEntity.PaymentPlan, entityId: id, details: payload }); } catch (error) { console.error("Error auditing paymentPlan.updated", error); }
    } catch (e) {
      console.error('Error updating payment plan', e);
      throw e;
    }
  },

  async deletePaymentPlan(id: string) {
    try {
      const snap = await get(ref(db, `paymentPlans/${id}`));
      const before = snap.exists() ? snap.val() : null;
      await remove(ref(db, `paymentPlans/${id}`));
      try { await auditLogService.logDelete(AuditEntity.PaymentPlan, id, before); } catch (error) { console.error("Error auditing paymentPlan.deleted", error); }
    } catch (e) {
      console.error('Error deleting payment plan', e);
      throw e;
    }
  },
};
