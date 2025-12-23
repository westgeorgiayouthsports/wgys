import { ref, push, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import type { Program, ProgramFormData } from '../types/program';
import { auditLogService } from './auditLog';

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
      console.error('Error fetching programs:', error);
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
      console.error('Error fetching programs by season:', error);
      throw error;
    }
  },

  async createProgram(programData: ProgramFormData, createdBy: string): Promise<string> {
    try {
      const programsRef = ref(db, 'programs');
      const now = new Date().toISOString();
      
      const cleanedData = Object.fromEntries(
        Object.entries(programData).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      const newProgram = {
        ...cleanedData,
        registrationOpen: true,
        currentParticipants: 0,
        createdAt: now,
        updatedAt: now,
        createdBy,
      };

      const result = await push(programsRef, newProgram);
      return result.key!;
    } catch (error) {
      console.error('Error creating program:', error);
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
      console.error('Error updating program:', error);
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
        await auditLogService.logDelete('program', programId, before);
      } catch (e) {
        console.error('Error auditing program.delete:', e);
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      throw error;
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
          entityType: 'program',
          entityId: programIds.join(','),
          details: { programIds, updates },
        });
      } catch (e) {
        console.error('Error auditing program.bulk_update:', e);
      }
    } catch (error) {
      console.error('Error bulk updating programs:', error);
      throw error;
    }
  },
};