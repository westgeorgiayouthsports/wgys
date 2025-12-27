import { ref, push, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';

export type SeasonProgram = {
  id?: string;
  seasonId: string;
  programId: string;
  enabled?: boolean;
  basePrice?: number | null;
  maxParticipants?: number | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  questions?: any[] | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
};

export const seasonProgramsService = {
  async getSeasonPrograms(): Promise<SeasonProgram[]> {
    try {
      const snap = await get(ref(db, 'seasonPrograms'));
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, v]: [string, any]) => ({ id, ...(v as any) } as SeasonProgram));
    } catch (e) {
      console.error('Error fetching seasonPrograms', e);
      return [];
    }
  },

  async getBySeason(seasonId: string): Promise<SeasonProgram[]> {
    try {
      const snap = await get(ref(db, `seasonPrograms`));
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data)
        .map(([id, v]: [string, any]) => ({ id, ...(v as any) } as SeasonProgram))
        .filter(sp => sp.seasonId === seasonId);
    } catch (e) {
      console.error('Error fetching seasonPrograms by season', e);
      return [];
    }
  },

  async getById(id: string): Promise<SeasonProgram | null> {
    try {
      const snap = await get(ref(db, `seasonPrograms/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() as any) } as SeasonProgram;
    } catch (e) {
      console.error('Error fetching seasonProgram', e);
      return null;
    }
  },

  async createSeasonProgram(payload: Partial<SeasonProgram>, createdBy?: string): Promise<string | null> {
    try {
      const now = new Date().toISOString();
      const clean = {
        ...payload,
        enabled: payload.enabled ?? true,
        createdAt: now,
        updatedAt: now,
        createdBy: createdBy || null,
      } as any;
      const res = await push(ref(db, 'seasonPrograms'), clean);
      try { await auditLogService.log({ action: 'seasonProgram.created', entityType: AuditEntity.SeasonProgram, entityId: res.key, details: clean }); } catch (e) { console.error('Audit log failed', e); }
      return res.key;
    } catch (e) {
      console.error('Error creating seasonProgram', e);
      throw e;
    }
  },

  async updateSeasonProgram(id: string, updates: Partial<SeasonProgram>) {
    try {
      const payload = { ...updates, updatedAt: new Date().toISOString() } as any;
      await update(ref(db, `seasonPrograms/${id}`), payload);
      try { await auditLogService.log({ action: 'seasonProgram.updated', entityType: AuditEntity.SeasonProgram, entityId: id, details: payload }); } catch (e) { console.error('Audit log failed', e); }
    } catch (e) {
      console.error('Error updating seasonProgram', e);
      throw e;
    }
  },

  async deleteSeasonProgram(id: string) {
    try {
      const snap = await get(ref(db, `seasonPrograms/${id}`));
      const before = snap.exists() ? snap.val() : null;
      await remove(ref(db, `seasonPrograms/${id}`));
      try { await auditLogService.log({ action: 'seasonProgram.deleted', entityType: AuditEntity.SeasonProgram, entityId: id, details: before }); } catch (e) { console.error('Audit log failed', e); }
    } catch (e) {
      console.error('Error deleting seasonProgram', e);
      throw e;
    }
  }
};
