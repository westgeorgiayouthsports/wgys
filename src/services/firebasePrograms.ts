import { ref, push, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import type { Program, ProgramFormData } from '../types/program';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import logger from '../utils/logger';
import { programTemplatesService } from './firebaseProgramTemplates';

export const programsService = {
  async getPrograms(): Promise<Program[]> {
    try {
      const programsRef = ref(db, 'programs');
      const snapshot = await get(programsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const programsData = snapshot.val();
      return Object.entries(programsData).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }));
    } catch (error) {
      logger.error('Error fetching programs:', error);
      throw error;
    }
  },

  async getProgramsBySeason(seasonId: string): Promise<Program[]> {
    try {
      const programsRef = ref(db, 'programs');
      const q = query(programsRef, orderByChild('seasonId'), equalTo(seasonId));
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      const programsData = snapshot.val();
      return Object.entries(programsData).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }));
    } catch (error) {
      logger.error('Error fetching programs by season:', error);
      throw error;
    }
  },

  async createProgram(programData: ProgramFormData, createdBy: string): Promise<string> {
    try {
      const programsRef = ref(db, 'programs');
      const now = new Date().toISOString();

      // Require templateId and seasonId
      if (!programData.templateId) throw new Error('templateId is required to create a program');
      if (!programData.seasonId) throw new Error('seasonId is required to create a program');

      // Fetch template defaults (if available)
      let tplDefaults: any = {};
      try {
        const tpl = await programTemplatesService.getTemplateById(programData.templateId as string);
        if (tpl) tplDefaults = tpl as any;
      } catch (e) {
        logger.error('Failed to load program template for defaults', e);
      }

      const cleanedData = Object.fromEntries(
        Object.entries(programData).filter(([_, value]) => value !== undefined && value !== '')
      );

      // Apply defaults from template when not provided in the form
      const applied: any = {
        ...tplDefaults,
        ...cleanedData,
      };

      // Ensure specific fields map: defaultBaseFee -> basePrice, sex -> sexRestriction
      if (tplDefaults.defaultBaseFee !== undefined && (applied.basePrice === undefined || applied.basePrice === null)) {
        applied.basePrice = tplDefaults.defaultBaseFee;
      }
      if (tplDefaults.sex && !applied.sexRestriction) applied.sexRestriction = tplDefaults.sex;

      const newProgram = {
        ...applied,
        registrationOpen: true,
        currentParticipants: 0,
        totalPayments: 0,
        createdAt: now,
        updatedAt: now,
        createdBy,
      } as any;

      const result = await push(programsRef, newProgram);
      try {
        await auditLogService.log({ action: 'program.created', entityType: AuditEntity.Program, entityId: result.key, details: newProgram });
      } catch (e) {
        logger.error('Error auditing program.create', e);
      }
      return result.key!;
    } catch (error) {
      logger.error('Error creating program:', error);
      throw error;
    }
  },

  async updateProgram(programId: string, programData: Partial<ProgramFormData>): Promise<void> {
    try {
      const programRef = ref(db, `programs/${programId}`);

      const cleanedData = Object.fromEntries(
        Object.entries(programData).filter(([_, value]) => value !== undefined && value !== '')
      );

      const updateData = {
        ...cleanedData,
        updatedAt: new Date().toISOString(),
      };

      await update(programRef, updateData);
    } catch (error) {
      logger.error('Error updating program:', error);
      throw error;
    }
  },

  async deleteProgram(programId: string): Promise<void> {
    try {
      const programRef = ref(db, `programs/${programId}`);
      const snap = await get(programRef);
      const before = snap.exists() ? snap.val() : null;
      await remove(programRef);
      try {
        await auditLogService.logDelete(AuditEntity.Program, programId, before);
      } catch (e) {
        logger.error('Error auditing program.delete:', e);
      }
    } catch (error) {
      logger.error('Error deleting program:', error);
      throw error;
    }
  },

  async unlinkProgram(programId: string): Promise<void> {
    try {
      const programRef = ref(db, `programs/${programId}`);
      const now = new Date().toISOString();
      await update(programRef, { seasonId: null, updatedAt: now } as any);
      try {
        await auditLogService.log({ action: 'program.unlinked_from_season', entityType: AuditEntity.Program, entityId: programId, details: { seasonId: null } });
      } catch (e) {
        logger.error('Error auditing program.unlinked_from_season', e);
      }
    } catch (e) {
      logger.error('Error unlinking program', e);
      throw e;
    }
  },

  async bulkUpdatePrograms(programIds: string[], updates: Partial<ProgramFormData & { seasonId?: string }>): Promise<void> {
    try {
      const now = new Date().toISOString();
      for (const id of programIds) {
        const programRef = ref(db, `programs/${id}`);
        const cleaned = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined && v !== ''));
        await update(programRef, { ...cleaned, updatedAt: now });
      }
      // Log audit entry for bulk update/move
      try {
        // include program IDs in entityId for visibility in audit UI
        await auditLogService.log({
          action: 'program.bulk_update',
          entityType: AuditEntity.Program,
          entityId: programIds.join(','),
          details: { programIds, updates },
        });
      } catch (e) {
        logger.error('Error auditing program.bulk_update:', e);
      }
    } catch (error) {
      logger.error('Error bulk updating programs:', error);
      throw error;
    }
  },
};