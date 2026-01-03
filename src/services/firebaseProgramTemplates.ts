import { ref, set, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import type { ProgramTemplate } from '../types/programTemplate';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

export const programTemplatesService = {
  async getTemplates(): Promise<ProgramTemplate[]> {
    try {
      const snapshot = await get(ref(db, 'programTemplates'));
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      return Object.entries(data).map(([id, tpl]: [string, any]) => ({ id, ...(tpl || {}) }));
    } catch (e) {
      logger.error('Error fetching program templates', e);
      return [];
    }
  },

  async getTemplateById(id: string): Promise<ProgramTemplate | null> {
    try {
      const snap = await get(ref(db, `programTemplates/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() || {}) } as ProgramTemplate;
    } catch (e) {
      logger.error('Error fetching program template', e);
      throw e;
    }
  },

  async createTemplate(data: Omit<ProgramTemplate, 'id' | 'createdAt' | 'updatedAt'>, _userId?: string) {
    try {
      const now = new Date().toISOString();
      // derive a stable human-readable id from sportId and programType (slugified)
      const base = slugify(`${data.sportId || 'template'}-${data.programType || 'template'}`);
      let id = base;
      // ensure uniqueness
      let suffix = 0;
      while ((await get(ref(db, `programTemplates/${id}`))).exists()) {
        suffix += 1;
        id = `${base}-${suffix}`;
      }
      const toWrite = { ...data, createdAt: now, updatedAt: now } as any;
      await set(ref(db, `programTemplates/${id}`), toWrite);
      try {
        await auditLogService.log({ action: 'programTemplate.created', entityType: AuditEntity.ProgramTemplate, entityId: id, details: toWrite });
      } catch (err) { logger.error('Error auditing programTemplate.create', err); }
      return id;
    } catch (e) {
      logger.error('Error creating program template', e);
      throw e;
    }
  },

  async updateTemplate(id: string, updates: Partial<ProgramTemplate>, _userId?: string) {
    try {
      const toWrite = { ...updates, updatedAt: new Date().toISOString() } as any;
      await update(ref(db, `programTemplates/${id}`), toWrite);
      try { await auditLogService.log({ action: 'programTemplate.updated', entityType: AuditEntity.ProgramTemplate, entityId: id, details: updates }); } catch (e) { logger.error('Error auditing programTemplate.update', e); }
    } catch (e) {
      logger.error('Error updating program template', e);
      throw e;
    }
  },

  async deleteTemplate(id: string, userId?: string) {
    try {
      const snap = await get(ref(db, `programTemplates/${id}`));
      const data = snap.exists() ? snap.val() : null;
      await remove(ref(db, `programTemplates/${id}`));
      try { await auditLogService.logDelete(AuditEntity.ProgramTemplate, id, data, userId); } catch (e) { logger.error('Error auditing programTemplate.delete', e); }
    } catch (e) {
      logger.error('Error deleting program template', e);
      throw e;
    }
  }
,
  // Ensure default base program templates exist (idempotent).
  async ensureDefaultProgramTemplates(): Promise<string[]> {
    try {
      const existing = await this.getTemplates();
      const created: string[] = [];
      const defaults: Array<Omit<ProgramTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
        { sportId: 'baseball', programType: 'recreation', defaultBaseFee: 200, sex: 'any', defaultMinAge: 3, defaultMaxAge: 18, active: true },
        { sportId: 'softball', programType: 'recreation', defaultBaseFee: 200, sex: 'female', defaultMinAge: 3, defaultMaxAge: 18, active: true },
        { sportId: 'baseball', programType: 'select', defaultBaseFee: 200, sex: 'any', defaultMinAge: 5, defaultMaxAge: 18, active: true },
        { sportId: 'softball', programType: 'select', defaultBaseFee: 200, sex: 'female', defaultMinAge: 5, defaultMaxAge: 18, active: true },
      ];
      for (const d of defaults) {
        const found = existing.find(t => (t.sportId === d.sportId) && (t.programType === d.programType));
        if (!found) {
          const id = await this.createTemplate(d as any);
          created.push(id);
        }
      }
      return created;
    } catch (e) {
      logger.error('Error ensuring default program templates', e);
      throw e;
    }
  }
};
