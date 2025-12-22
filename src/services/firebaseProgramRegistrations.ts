import { ref, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import type { ProgramFormResponse } from '../types/programForm';

export interface ProgramRegistrationRecord {
  id: string;
  programId: string;
  programName?: string;
  athleteId?: string;
  playerName?: string;
  familyId?: string;
  registeredBy: string;
  responses: ProgramFormResponse[];
  status: 'cart' | 'pending' | 'confirmed' | 'cancelled';
  paymentMethod: string;
  paymentDisplay?: string;
  paymentPlan?: 'full' | 'plan';
  totalAmount: number;
  registrationDate: string;
  createdAt: string;
  updatedAt?: string;
}

export const programRegistrationsService = {
  async createProgramRegistration(
    programId: string,
    registeredBy: string,
    responses: ProgramFormResponse[],
    totalAmount: number,
    paymentMethod: string,
    athleteId?: string,
    familyId?: string,
    paymentPlan?: 'full' | 'plan',
    extras?: Partial<Pick<ProgramRegistrationRecord, 'programName' | 'playerName' | 'paymentDisplay'>>
  ): Promise<ProgramRegistrationRecord> {
    try {
      const regsRef = ref(db, 'programRegistrations');
      const newRef = push(regsRef);
      const record: Omit<ProgramRegistrationRecord, 'id'> = {
        programId,
        programName: extras?.programName,
        athleteId: athleteId || undefined,
        playerName: extras?.playerName,
        familyId: familyId || undefined,
        registeredBy,
        responses,
        status: 'pending',
        paymentMethod,
        paymentDisplay: extras?.paymentDisplay,
        paymentPlan: paymentPlan || 'full',
        totalAmount,
        registrationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await set(newRef, record);

      return {
        id: newRef.key as string,
        ...record,
      } as ProgramRegistrationRecord;
    } catch (error) {
      console.error('❌ Error creating program registration:', error);
      throw error;
    }
  },

  async getProgramRegistration(id: string) {
    try {
      const r = ref(db, `programRegistrations/${id}`);
      const snap = await get(r);
      if (!snap.exists()) return null;
      return { id, ...snap.val() } as ProgramRegistrationRecord;
    } catch (error) {
      console.error('❌ Error fetching program registration:', error);
      throw error;
    }
  }
,
  async getProgramRegistrationsByFamily(familyId: string) {
    try {
      const regsRef = ref(db, 'programRegistrations');
      const q = query(regsRef, orderByChild('familyId'), equalTo(familyId));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, val]) => ({ id, ...(val as any) })) as ProgramRegistrationRecord[];
    } catch (error) {
      console.error('❌ Error querying registrations by family:', error);
      throw error;
    }
  },

  async getProgramRegistrationsByAthlete(athleteId: string) {
    try {
      const regsRef = ref(db, 'programRegistrations');
      const q = query(regsRef, orderByChild('athleteId'), equalTo(athleteId));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const data = snap.val();
      return Object.entries(data).map(([id, val]) => ({ id, ...(val as any) })) as ProgramRegistrationRecord[];
    } catch (error) {
      console.error('❌ Error querying registrations by athlete:', error);
      throw error;
    }
  },
  async getAllProgramRegistrations() {
    try {
      const regsRef = ref(db, 'programRegistrations');
      const snap = await get(regsRef);
      if (!snap.exists()) return [];
      const data = snap.val();
      const list = Object.entries(data).map(([id, val]) => ({ id, ...(val as any) })) as ProgramRegistrationRecord[];
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('❌ Error fetching all program registrations:', error);
      throw error;
    }
  },
};
