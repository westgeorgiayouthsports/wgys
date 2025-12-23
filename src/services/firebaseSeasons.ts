import { ref, set, get, update, remove, query as _query, orderByChild as _orderByChild, equalTo as _equalTo } from 'firebase/database';
import { db } from './firebase';
import type { Season, SeasonFormData } from '../types/season';
import { programsService } from './firebasePrograms';
import { teamsService } from './firebaseTeams';
import { auditLogService } from './auditLog';

export const seasonsService = {
  async getSeasons(): Promise<Season[]> {
    try {
      const snapshot = await get(ref(db, 'seasons'));
      if (!snapshot.exists()) return [];
      
      const data = snapshot.val();
      if (!data) return [];
      return Object.entries(data).map(([id, season]: [string, any]) => ({
        id,
        ...season,
      }));
    } catch (error) {
      console.error('Error fetching seasons:', error);
      return [];
    }
  },

  async archiveSeasonCascade(seasonId: string, actorId?: string): Promise<void> {
    // Archive season, all programs in that season, and their teams
    const now = new Date().toISOString();

    // 1) Archive season
    await update(ref(db, `seasons/${seasonId}`), {
      status: 'archived',
      updatedAt: now,
      archivedAt: now,
    });

    // 2) Archive programs in this season
    const programs = await programsService.getProgramsBySeason(seasonId);
    for (const program of programs) {
      const programRef = ref(db, `programs/${program.id}`);
      await update(programRef, {
        active: false,
        status: 'archived',
        updatedAt: now,
        archivedAt: now,
      });

      // 3) Archive teams for each program
      const teams = await teamsService.getTeamsByProgram(program.id);
      for (const team of teams) {
        await teamsService.updateTeam(team.id, {
          status: 'archived',
          updatedAt: now,
        });
      }
    }
    // write audit log summarizing cascade
    try {
      await auditLogService.log({
        action: 'season.archive_cascade',
        entityType: 'season',
        entityId: seasonId,
        actorId: actorId ?? undefined,
        details: {
          programCount: programs.length,
          teamCount: programs.reduce((acc, p) => acc + (p.currentRegistrants ? 0 : 0), 0),
        },
      });
    } catch (e) {
      console.error('Error auditing season.archive_cascade:', e);
    }
  },

  async getActiveSeasons(): Promise<Season[]> {
    try {
      const allSeasons = await this.getSeasons();
      return allSeasons.filter(s => s.status === 'active');
    } catch (error) {
      console.error('Error fetching active seasons:', error);
      throw error;
    }
  },

  async getSeasonById(seasonId: string): Promise<Season | null> {
    try {
      const snapshot = await get(ref(db, `seasons/${seasonId}`));
      if (!snapshot.exists()) return null;
      
      return {
        id: seasonId,
        ...snapshot.val(),
      };
    } catch (error) {
      console.error('Error fetching season:', error);
      throw error;
    }
  },

  async createSeason(formData: SeasonFormData, userId: string): Promise<string> {
    try {
      const now = new Date().toISOString();
      const newSeasonRef = ref(db, `seasons/${Date.now()}`);
      const seasonId = newSeasonRef.key!;
      // Remove undefined or empty string fields to avoid Firebase set errors
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '')
      );

      const seasonData: Season = {
        id: seasonId,
        ...(cleanedData as any),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      };

      await set(newSeasonRef, seasonData);
      try {
        await auditLogService.log({
          action: 'season.created',
          entityType: 'season',
          entityId: seasonId,
          details: seasonData,
        });
      } catch (e) {
        console.error('Error auditing season.created:', e);
      }
      return seasonId;
    } catch (error) {
      console.error('Error creating season:', error);
      throw error;
    }
  },

  async updateSeason(seasonId: string, updates: Partial<Season>, actorId?: string): Promise<void> {
    try {
      const seasonRef = ref(db, `seasons/${seasonId}`);
      const cleaned = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
      );

      await update(seasonRef, {
        ...(cleaned as any),
        updatedAt: new Date().toISOString(),
      });
      try {
        await auditLogService.log({
          action: 'season.updated',
          entityType: 'season',
          entityId: seasonId,
          actorId: actorId ?? undefined,
          details: cleaned,
        });
      } catch (e) {
        console.error('Error auditing season.updated:', e);
      }
    } catch (error) {
      console.error('Error updating season:', error);
      throw error;
    }
  },

  async archiveSeason(seasonId: string): Promise<void> {
    try {
      await this.updateSeason(seasonId, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving season:', error);
      throw error;
    }
  },

  async deleteSeason(seasonId: string, actorId?: string): Promise<void> {
    try {
      // Prevent deletion if programs still reference this season
      const linkedPrograms = await programsService.getProgramsBySeason(seasonId);
      if (linkedPrograms && linkedPrograms.length > 0) {
        throw new Error('Cannot delete season: programs are still linked to this season');
      }
      // Read existing data so we can capture details in the audit log
      const snap = await get(ref(db, `seasons/${seasonId}`));
      const seasonData = snap.exists() ? snap.val() : null;

      await remove(ref(db, `seasons/${seasonId}`));
      try {
        await auditLogService.logDelete('season', seasonId, seasonData, actorId ?? undefined);
      } catch (e) {
        console.error('Error auditing season.delete:', e);
      }
    } catch (error) {
      console.error('Error deleting season:', error);
      throw error;
    }
  },
};
