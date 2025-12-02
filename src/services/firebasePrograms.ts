import { ref, push, get, update, remove } from 'firebase/database';
import { db } from './firebase';
import type { Program, ProgramFormData } from '../types/program';

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
      await remove(programRef);
    } catch (error) {
      console.error('Error deleting program:', error);
      throw error;
    }
  },
};