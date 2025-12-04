import { ref, set, get, update, remove, push } from 'firebase/database';
import { db } from './firebase';
import type { Family } from '../types/person';

export const familiesService = {
  async getFamilies(): Promise<Family[]> {
    try {
      const familiesRef = ref(db, 'families');
      const snapshot = await get(familiesRef);
      if (!snapshot.exists()) return [];
      const families = snapshot.val() as Record<string, Omit<Family, 'id'>>;
      return Object.entries(families).map(([id, family]) => ({ id, ...family } as Family));
    } catch (error) {
      console.error('Error fetching families:', error);
      throw error;
    }
  },

  async getFamily(familyId: string): Promise<Family | null> {
    try {
      const familyRef = ref(db, `families/${familyId}`);
      const snapshot = await get(familyRef);
      if (!snapshot.exists()) return null;
      return { id: familyId, ...snapshot.val() } as Family;
    } catch (error) {
      console.error('Error fetching family:', error);
      throw error;
    }
  },

  async createFamily(family: Omit<Family, 'id'>): Promise<string> {
    try {
      const familiesRef = ref(db, 'families');
      const newFamilyRef = push(familiesRef);
      await set(newFamilyRef, family);
      return newFamilyRef.key!;
    } catch (error) {
      console.error('Error creating family:', error);
      throw error;
    }
  },

  async updateFamily(familyId: string, updates: Partial<Family>): Promise<void> {
    try {
      const familyRef = ref(db, `families/${familyId}`);
      await update(familyRef, { ...updates, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error updating family:', error);
      throw error;
    }
  },

  async deleteFamily(familyId: string): Promise<void> {
    try {
      const familyRef = ref(db, `families/${familyId}`);
      await remove(familyRef);
    } catch (error) {
      console.error('Error deleting family:', error);
      throw error;
    }
  },
};
