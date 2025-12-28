import { ref, push, set, get, remove } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import type { RegistrationPaymentMethod } from '../types';
import logger from '../utils/logger';

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
  paymentMethod: RegistrationPaymentMethod;
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
      logger.error('❌ Error fetching team assignments:', error);
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
      logger.error('❌ Error fetching all team assignments:', error);
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
    paymentMethod: RegistrationPaymentMethod
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

      try {
        await auditLogService.log({ action: 'registration.created', entityType: AuditEntity.TeamAssignment, entityId: newAssignmentRef.key, details: assignment });
      } catch (e) {
        logger.error('Error auditing registration.created:', e);
      }

      return {
        id: newAssignmentRef.key,
        ...assignment,
      } as TeamAssignment;
    } catch (error) {
      logger.error('❌ Error creating registration:', error);
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
        try {
          await auditLogService.log({ action: 'registration.updated', entityType: AuditEntity.TeamAssignment, entityId: id, details: updates });
        } catch (e) {
          logger.error('Error auditing registration.updated:', e);
        }
      }
    } catch (error) {
      logger.error('❌ Error updating registration:', error);
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
        try {
          await auditLogService.log({ action: 'registration.approved', entityType: AuditEntity.TeamAssignment, entityId: id, details: { rosterPlayerId } });
        } catch (e) {
          logger.error('Error auditing registration.approved:', e);
        }
      }
    } catch (error) {
      logger.error('❌ Error approving registration:', error);
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
        try {
          await auditLogService.log({ action: 'registration.paid', entityType: AuditEntity.TeamAssignment, entityId: id });
        } catch (e) {
          logger.error('Error auditing registration.paid:', e);
        }
      }
    } catch (error) {
      logger.error('❌ Error marking registration as paid:', error);
      throw error;
    }
  },

  // Delete registration
  async deleteRegistration(id: string): Promise<void> {
    try {
      const regRef = ref(db, `registrations/${id}`);
      await remove(regRef);
      try {
        await auditLogService.log({ action: 'registration.deleted', entityType: AuditEntity.TeamAssignment, entityId: id });
      } catch (e) {
        logger.error('Error auditing registration.deleted:', e);
      }
    } catch (error) {
      logger.error('❌ Error deleting registration:', error);
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
      logger.error('❌ Error fetching team assignments by status:', error);
      throw error;
    }
  },
};
