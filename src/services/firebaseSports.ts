import { ref, get, update, remove, set } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

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
      logger.error('Error fetching sports', e);
      return [];
    }
  },

  async getById(id: string): Promise<Sport | null> {
    try {
      const snap = await get(ref(db, `sports/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() as any) } as Sport;
    } catch (e) {
      logger.error('Error fetching sport', e);
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

      // Prevent duplicate names (case-insensitive)
      try {
        const allSnap = await get(ref(db, 'sports'));
        if (allSnap.exists()) {
          const data = allSnap.val();
          const entries = Object.entries(data) as [string, any][];
          const dupByName = entries.find(([, v]) => String((v as any).name || '').trim().toLowerCase() === String(payload.name || '').trim().toLowerCase());
          if (dupByName) throw new Error('A sport with that name already exists');
        }
      } catch (e) {
        if ((e as Error).message === 'A sport with that name already exists') throw e;
        logger.error('Error checking duplicate sport names', e);
      }

      // If caller provided an id, use it (must be slug-like). Otherwise derive one.
      let id = payload.id ? String(payload.id) : slugify(String(payload.name || ''));
      // Ensure id is not already taken
      const existing = await get(ref(db, `sports/${id}`));
      if (existing.exists()) {
        throw new Error('Sport id already exists');
      }

      await set(ref(db, `sports/${id}`), clean);
      try { await auditLogService.log({ action: 'sport.created', entityType: AuditEntity.Sport, entityId: id, details: clean }); } catch (e) { logger.error('Error auditing sport.created', e); }
      return id;
    } catch (e) {
      logger.error('Error creating sport', e);
      throw e;
    }
  },

  async updateSport(id: string, updates: Partial<Sport>) {
    try {
      // Prevent changing to a name that duplicates another sport
      if (updates.name) {
        const allSnap = await get(ref(db, 'sports'));
        if (allSnap.exists()) {
          const data = allSnap.val();
          const entries = Object.entries(data) as [string, any][];
          const dup = entries.find(([k, v]) => k !== id && String((v as any).name || '').trim().toLowerCase() === String(updates.name || '').trim().toLowerCase());
          if (dup) throw new Error('A sport with that name already exists');
        }
      }

      const payload = { ...updates, updatedAt: new Date().toISOString() } as any;
      await update(ref(db, `sports/${id}`), payload);
      try { await auditLogService.log({ action: 'sport.updated', entityType: AuditEntity.Sport, entityId: id, details: payload }); } catch (e) { logger.error('Error auditing sport.updated', e); }
    } catch (e) {
      logger.error('Error updating sport', e);
      throw e;
    }
  },

  async deleteSport(id: string) {
    try {
      const snap = await get(ref(db, `sports/${id}`));
      const before = snap.exists() ? snap.val() : null;
      await remove(ref(db, `sports/${id}`));
      try { await auditLogService.log({ action: 'sport.deleted', entityType: AuditEntity.Sport, entityId: id, details: before }); } catch (e) { logger.error('Error auditing sport.deleted', e); }
    } catch (e) {
      logger.error('Error deleting sport', e);
      throw e;
    }
  }
};
