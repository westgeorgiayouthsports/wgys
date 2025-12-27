import { ref, push, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';

export type Sport = {
  id?: string;
  name: string;
  ageControlDate: string; // MM-DD
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
};

export const sportsService = {
  async getSports(): Promise<Sport[]> {
    try {
      const snap = await get(ref(db, 'sports'));
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...(v as any) } as Sport));
    } catch (e) {
      console.error('Error fetching sports', e);
      return [];
    }
  },

  async getById(id: string): Promise<Sport | null> {
    try {
      const snap = await get(ref(db, `sports/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() as any) } as Sport;
    } catch (e) {
      console.error('Error fetching sport', e);
      return null;
    }
  },

  async createSport(payload: Partial<Sport>, createdBy?: string): Promise<string | null> {
    try {
      const now = new Date().toISOString();
      const clean = {
        name: payload.name,
        ageControlDate: payload.ageControlDate,
        createdAt: now,
        updatedAt: now,
        createdBy: createdBy || null,
      } as any;
      const res = await push(ref(db, 'sports'), clean);
      try { await auditLogService.log({ action: 'sport.created', entityType: AuditEntity.Sport, entityId: res.key, details: clean }); } catch (e) { console.error('Error auditing sport.created', e); }
      return res.key;
    } catch (e) {
      console.error('Error creating sport', e);
      throw e;
    }
  },

  async updateSport(id: string, updates: Partial<Sport>) {
    try {
      const payload = { ...updates, updatedAt: new Date().toISOString() } as any;
      await update(ref(db, `sports/${id}`), payload);
      try { await auditLogService.log({ action: 'sport.updated', entityType: AuditEntity.Sport, entityId: id, details: payload }); } catch (e) { console.error('Error auditing sport.updated', e); }
    } catch (e) {
      console.error('Error updating sport', e);
      throw e;
    }
  },

  async deleteSport(id: string) {
    try {
      const snap = await get(ref(db, `sports/${id}`));
      const before = snap.exists() ? snap.val() : null;
      await remove(ref(db, `sports/${id}`));
      try { await auditLogService.log({ action: 'sport.deleted', entityType: AuditEntity.Sport, entityId: id, details: before }); } catch (e) { console.error('Error auditing sport.deleted', e); }
    } catch (e) {
      console.error('Error deleting sport', e);
      throw e;
    }
  }
};
