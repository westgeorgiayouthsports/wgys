import { ref, set, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import type { ProgramTemplate } from '../types/programTemplate';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';

export const programTemplatesService = {
  async getTemplates(): Promise<ProgramTemplate[]> {
    try {
      const snapshot = await get(ref(db, 'programTemplates'));
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      return Object.entries(data).map(([id, tpl]: [string, any]) => ({ id, ...(tpl || {}) }));
    } catch (e) {
      console.error('Error fetching program templates', e);
      return [];
    }
  },

  async getTemplateById(id: string): Promise<ProgramTemplate | null> {
    try {
      const snap = await get(ref(db, `programTemplates/${id}`));
      if (!snap.exists()) return null;
      return { id, ...(snap.val() || {}) } as ProgramTemplate;
    } catch (e) {
      console.error('Error fetching program template', e);
      throw e;
    }
  },

  async createTemplate(data: Omit<ProgramTemplate, 'id' | 'createdAt' | 'updatedAt'>, _userId?: string) {
    try {
      const now = new Date().toISOString();
      const id = Date.now().toString();
      const toWrite = { ...data, createdAt: now, updatedAt: now } as any;
      await set(ref(db, `programTemplates/${id}`), toWrite);
      try {
        await auditLogService.log({ action: 'programTemplate.created', entityType: AuditEntity.ProgramTemplate, entityId: id, details: toWrite });
      } catch (err) { console.error('Error auditing programTemplate.create', err); }
      return id;
    } catch (e) {
      console.error('Error creating program template', e);
      throw e;
    }
  },

  async updateTemplate(id: string, updates: Partial<ProgramTemplate>, _userId?: string) {
    try {
      const toWrite = { ...updates, updatedAt: new Date().toISOString() } as any;
      await update(ref(db, `programTemplates/${id}`), toWrite);
      try { await auditLogService.log({ action: 'programTemplate.updated', entityType: AuditEntity.ProgramTemplate, entityId: id, details: updates }); } catch (e) { console.error('Error auditing programTemplate.update', e); }
    } catch (e) {
      console.error('Error updating program template', e);
      throw e;
    }
  },

  async deleteTemplate(id: string, userId?: string) {
    try {
      const snap = await get(ref(db, `programTemplates/${id}`));
      const data = snap.exists() ? snap.val() : null;
      await remove(ref(db, `programTemplates/${id}`));
      try { await auditLogService.logDelete(AuditEntity.ProgramTemplate, id, data, userId); } catch (e) { console.log('Error auditing programTemplate.delete', e); }
    } catch (e) {
      console.error('Error deleting program template', e);
      throw e;
    }
  }
};
