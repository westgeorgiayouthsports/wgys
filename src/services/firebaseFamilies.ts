import { ref, push, get, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import type { Family, FamilyMember, Registration } from '../types/family';

export const familiesService = {
  async getFamilies(): Promise<Family[]> {
    try {
      const familiesRef = ref(db, 'families');
      const snapshot = await get(familiesRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const familiesData = snapshot.val();
      return Object.entries(familiesData).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }));
    } catch (error) {
      console.error('Error fetching families:', error);
      throw error;
    }
  },

  async getFamilyByUserId(userId: string): Promise<Family | null> {
    try {
      const familiesRef = ref(db, 'families');
      const snapshot = await get(familiesRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      const familiesData = snapshot.val();
      const family = Object.entries(familiesData).find(([_, data]: [string, any]) => 
        data.members?.some((member: FamilyMember) => member.userId === userId)
      );

      if (family) {
        const [id, data] = family;
        return { id, ...data } as Family;
      }

      return null;
    } catch (error) {
      console.error('Error fetching family by user ID:', error);
      throw error;
    }
  },

  async createFamily(familyData: Omit<Family, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<string> {
    try {
      const familiesRef = ref(db, 'families');
      const now = new Date().toISOString();
      
      const newFamily = {
        ...familyData,
        createdAt: now,
        updatedAt: now,
        createdBy,
      };

      const result = await push(familiesRef, newFamily);
      return result.key!;
    } catch (error) {
      console.error('Error creating family:', error);
      throw error;
    }
  },

  async updateFamily(familyId: string, familyData: Partial<Family>): Promise<void> {
    try {
      const familyRef = ref(db, `families/${familyId}`);
      
      const updateData = {
        ...familyData,
        updatedAt: new Date().toISOString(),
      };

      await update(familyRef, updateData);
    } catch (error) {
      console.error('Error updating family:', error);
      throw error;
    }
  },

  async getRegistrations(): Promise<Registration[]> {
    try {
      const registrationsRef = ref(db, 'registrations');
      const snapshot = await get(registrationsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const registrationsData = snapshot.val();
      return Object.entries(registrationsData).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }));
    } catch (error) {
      console.error('Error fetching registrations:', error);
      throw error;
    }
  },

  async createRegistration(registrationData: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const registrationsRef = ref(db, 'registrations');
      const now = new Date().toISOString();
      
      const newRegistration = {
        ...registrationData,
        createdAt: now,
        updatedAt: now,
      };

      const result = await push(registrationsRef, newRegistration);
      return result.key!;
    } catch (error) {
      console.error('Error creating registration:', error);
      throw error;
    }
  },
};