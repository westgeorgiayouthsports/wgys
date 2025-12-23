import { ref, set, get, update, remove, query, orderByChild, equalTo, push } from 'firebase/database';
import { db, auth } from './firebase';
import { auditLogService } from './auditLog';
import type { Team } from '../store/slices/teamsSlice';

export const teamsService = {
  // Get all teams
  async getTeams(): Promise<Team[]> {
    try {
      const teamsRef = ref(db, 'teams');
      const snapshot = await get(teamsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const teams = snapshot.val();
      return Object.entries(teams).map(([id, team]) => {
        const { id: _, ...teamData } = team as Team;
        return { id, ...teamData } as Team;
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  },

  // Get all teams for a user
  async getUserTeams(_userId: string): Promise<Team[]> {
    try {
      const teamsRef = ref(db, 'teams');
      const snapshot = await get(teamsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const teams = snapshot.val();
      return Object.entries(teams).map(([id, team]) => {
        const { id: _, ...teamData } = team as Team;
        return { id, ...teamData } as Team;
      });
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  },

  // Create a new team
  async createTeam(team: Omit<Team, 'id'>): Promise<Team> {
    try {
      const teamsRef = ref(db, 'teams');
      const newTeamRef = push(teamsRef);
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('User must be authenticated to create a team');

      const { coachId, ...rest } = team;
      const teamData = {
        ...rest,
        ...(coachId && { coachId }),
        userId: uid,
        id: newTeamRef.key,
        createdAt: new Date().toISOString(),
      };

      await set(newTeamRef, teamData);
      
      // audit
      try {
        await auditLogService.log({ action: 'team.created', entityType: 'team', entityId: newTeamRef.key, details: teamData });
      } catch (e) {
        console.error('Error auditing team.created:', e);
      }

      return teamData as Team;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  },

  // Update a team
  async updateTeam(id: string, updates: Partial<Team>): Promise<void> {
    try {
      if (!id) throw new Error('Team ID is required');
      const { id: _, createdAt: _createdAt, ...filteredUpdates } = updates;
      const teamRef = ref(db, `teams/${id}`);
      await update(teamRef, {
        ...filteredUpdates,
        updatedAt: new Date().toISOString(),
      });
      try {
        await auditLogService.log({ action: 'team.updated', entityType: 'team', entityId: id, details: filteredUpdates });
      } catch (e) {
        console.error('Error auditing team.updated:', e);
      }
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  },

  // Delete a team
  async deleteTeam(id: string): Promise<void> {
    try {
      const teamRef = ref(db, `teams/${id}`);
      const snap = await get(teamRef);
      const before = snap.exists() ? snap.val() : null;
      await remove(teamRef);
      try {
        await auditLogService.logDelete('team', id, before);
      } catch (e) {
        console.error('Error auditing team.delete:', e);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  },

  // Get a single team by id
  async getTeamById(id: string): Promise<Team | null> {
    try {
      if (!id) return null;
      const teamRef = ref(db, `teams/${id}`);
      const snapshot = await get(teamRef);
      if (!snapshot.exists()) return null;
      const data = snapshot.val();
      return { id, ...data } as Team;
    } catch (error) {
      console.error('Error fetching team:', error);
      throw error;
    }
  },

  // Get teams for a specific program
  async getTeamsByProgram(programId: string): Promise<Team[]> {
    try {
      const teamsRef = ref(db, 'teams');
      const q = query(teamsRef, orderByChild('programId'), equalTo(programId));
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      const teams = snapshot.val();
      return Object.entries(teams).map(([id, team]) => ({ id, ...(team as any) })) as Team[];
    } catch (error) {
      console.error('Error fetching teams by program:', error);
      throw error;
    }
  },
};
