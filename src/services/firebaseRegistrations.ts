import { ref, push, set, get, remove } from 'firebase/database';
import { db } from './firebase';

export interface Registration {
  id: string;
  teamId: string;
  playerName: string;
  playerAge: number;
  playerPosition?: string;
  parentName: string;
  parentEmail: string;
  phoneNumber: string;
  fee: number;
  paymentMethod: 'stripe' | 'paypal' | 'square' | 'check' | 'cash';
  status: 'pending' | 'approved' | 'paid';
  rosterPlayerId?: string;
  createdAt: string;
  updatedAt?: string;
}

export const registrationsService = {
  // Get all registrations for a team
  async getTeamRegistrations(teamId: string): Promise<Registration[]> {
    try {
      const regsRef = ref(db, 'registrations');
      const snapshot = await get(regsRef);

      if (!snapshot.exists()) return [];

      const registrations: Registration[] = [];
      snapshot.forEach((child) => {
        const reg = { id: child.key!, ...child.val() } as Registration;
        if (reg.teamId === teamId) {
          registrations.push(reg);
        }
      });

      return registrations.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching team registrations:', error);
      throw error;
    }
  },

  // Get all registrations
  async getAllRegistrations(): Promise<Registration[]> {
    try {
      const regsRef = ref(db, 'registrations');
      const snapshot = await get(regsRef);

      if (!snapshot.exists()) return [];

      const registrations: Registration[] = [];
      snapshot.forEach((child) => {
        const reg = { id: child.key!, ...child.val() } as Registration;
        registrations.push(reg);
      });

      return registrations.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching all registrations:', error);
      throw error;
    }
  },

  // Create registration
  async createRegistration(
    teamId: string,
    playerName: string,
    playerAge: number,
    playerPosition: string | undefined,
    parentName: string,
    parentEmail: string,
    phoneNumber: string,
    fee: number,
    paymentMethod: 'stripe' | 'paypal' | 'square' | 'check' | 'cash'
  ): Promise<Registration> {
    try {
      const regsRef = ref(db, 'registrations');
      const newRegRef = push(regsRef);

      const registration = {
        teamId,
        playerName,
        playerAge,
        playerPosition,
        parentName,
        parentEmail,
        phoneNumber,
        fee,
        paymentMethod,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      await set(newRegRef, registration);

      return {
        id: newRegRef.key!,
        ...registration,
      };
    } catch (error) {
      console.error('❌ Error creating registration:', error);
      throw error;
    }
  },

  // Update registration
  async updateRegistration(
    id: string,
    updates: Partial<Omit<Registration, 'id'>>
  ): Promise<void> {
    try {
      const regRef = ref(db, `registrations/${id}`);
      const snapshot = await get(regRef);

      if (snapshot.exists()) {
        await set(regRef, {
          ...snapshot.val(),
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Error updating registration:', error);
      throw error;
    }
  },

  // Approve registration
  async approveRegistration(id: string, rosterPlayerId?: string): Promise<void> {
    try {
      const regRef = ref(db, `registrations/${id}`);
      const snapshot = await get(regRef);

      if (snapshot.exists()) {
        await set(regRef, {
          ...snapshot.val(),
          status: 'approved',
          rosterPlayerId,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Error approving registration:', error);
      throw error;
    }
  },

  // Mark as paid
  async markAsPaid(id: string): Promise<void> {
    try {
      const regRef = ref(db, `registrations/${id}`);
      const snapshot = await get(regRef);

      if (snapshot.exists()) {
        await set(regRef, {
          ...snapshot.val(),
          status: 'paid',
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Error marking registration as paid:', error);
      throw error;
    }
  },

  // Delete registration
  async deleteRegistration(id: string): Promise<void> {
    try {
      const regRef = ref(db, `registrations/${id}`);
      await remove(regRef);
    } catch (error) {
      console.error('❌ Error deleting registration:', error);
      throw error;
    }
  },

  // Get registrations by status
  async getRegistrationsByStatus(
    teamId: string,
    status: 'pending' | 'approved' | 'paid'
  ): Promise<Registration[]> {
    try {
      const regsRef = ref(db, 'registrations');
      const snapshot = await get(regsRef);

      if (!snapshot.exists()) return [];

      const registrations: Registration[] = [];
      snapshot.forEach((child) => {
        const reg = { id: child.key!, ...child.val() } as Registration;
        if (reg.teamId === teamId && reg.status === status) {
          registrations.push(reg);
        }
      });

      return registrations.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching registrations by status:', error);
      throw error;
    }
  },
};
