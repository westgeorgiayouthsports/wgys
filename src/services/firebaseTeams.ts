import { ref, set, get, update, remove, query, orderByChild, equalTo, push } from 'firebase/database';
import { db } from './firebase';
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
  async getUserTeams(userId: string): Promise<Team[]> {
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
      
      const teamData = {
        ...team,
        id: newTeamRef.key,
        createdAt: new Date().toISOString(),
      };

      await set(newTeamRef, teamData);
      
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
      const { id: _, createdAt, ...filteredUpdates } = updates;
      const teamRef = ref(db, `teams/${id}`);
      await update(teamRef, {
        ...filteredUpdates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  },

  // Delete a team
  async deleteTeam(id: string): Promise<void> {
    try {
      const teamRef = ref(db, `teams/${id}`);
      await remove(teamRef);
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  },
};
