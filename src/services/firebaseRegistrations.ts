import { ref, push, set, get, remove } from 'firebase/database';
import { db } from './firebase';

export interface TeamAssignment {
  id: string;
  teamId: string;
  playerName: string;
  playerAge: number;
  playerPosition?: string;
  parentName: string;
  parentEmail: string;
  phoneNumber: string;
  fee: number;
  paymentMethod: 'stripe' | 'paypal' | 'square' | 'check' | 'cash' | 'venmo' | 'cashapp' | 'other';
  status: 'pending' | 'approved' | 'paid';
  rosterPlayerId?: string;
  createdAt: string;
  updatedAt?: string;
}

// Legacy export for backwards compatibility
export type Registration = TeamAssignment;

export const registrationsService = {
  // Get all team assignments for a team
  async getTeamRegistrations(teamId: string): Promise<TeamAssignment[]> {
    try {
      const assignmentsRef = ref(db, 'teamAssignments');
      const snapshot = await get(assignmentsRef);

      if (!snapshot.exists()) return [];

      const assignments: TeamAssignment[] = [];
      snapshot.forEach((child) => {
        const assignment = { id: child.key, ...child.val() } as TeamAssignment;
        if (assignment.teamId === teamId) {
          assignments.push(assignment);
        }
      });

      return assignments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching team assignments:', error);
      throw error;
    }
  },

  // Get all team assignments
  async getAllRegistrations(): Promise<TeamAssignment[]> {
    try {
      const assignmentsRef = ref(db, 'teamAssignments');
      const snapshot = await get(assignmentsRef);

      if (!snapshot.exists()) return [];

      const assignments: TeamAssignment[] = [];
      snapshot.forEach((child) => {
        const assignment = { id: child.key, ...child.val() } as TeamAssignment;
        assignments.push(assignment);
      });

      return assignments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching all team assignments:', error);
      throw error;
    }
  },

  // Create team assignment
  async createRegistration(
    teamId: string,
    playerName: string,
    playerAge: number,
    playerPosition: string | undefined,
    parentName: string,
    parentEmail: string,
    phoneNumber: string,
    fee: number,
    paymentMethod: 'stripe' | 'paypal' | 'square' | 'check' | 'cash' | 'venmo' | 'cashapp' | 'other'
  ): Promise<TeamAssignment> {
    try {
      const assignmentsRef = ref(db, 'teamAssignments');
      const newAssignmentRef = push(assignmentsRef);

      const assignment = {
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

      await set(newAssignmentRef, assignment);

      return {
        id: newAssignmentRef.key,
        ...assignment,
      } as TeamAssignment;
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
  ): Promise<TeamAssignment[]> {
    try {
      const assignmentsRef = ref(db, 'teamAssignments');
      const snapshot = await get(assignmentsRef);

      if (!snapshot.exists()) return [];

      const assignments: TeamAssignment[] = [];
      snapshot.forEach((child) => {
        const assignment = { id: child.key, ...child.val() } as TeamAssignment;
        if (assignment.teamId === teamId && assignment.status === status) {
          assignments.push(assignment);
        }
      });

      return assignments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error fetching team assignments by status:', error);
      throw error;
    }
  },
};
