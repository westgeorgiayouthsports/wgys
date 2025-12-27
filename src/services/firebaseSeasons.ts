import { ref, set, get, update, remove, query as _query, orderByChild as _orderByChild, equalTo as _equalTo } from 'firebase/database';
import { db } from './firebase';
import type { Season, SeasonFormData } from '../types/season';
import { SeasonTypeValues } from '../types/enums/season';
import type { SeasonType } from '../types/enums/season';
import { programsService } from './firebasePrograms';
import { teamsService } from './firebaseTeams';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import { SeasonStatusValues } from '../types/enums/season';

export const seasonsService = {
  deriveSeasonMeta(startDateStr: string): { type: SeasonType; year: number } {
    try {
      // Parse YYYY-MM-DD explicitly to avoid timezone shift issues when using Date(string)
      const m = (startDateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let d: Date;
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const da = Number(m[3]);
        d = new Date(y, mo - 1, da);
      } else {
        d = new Date(startDateStr);
      }
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      let type: SeasonType;
      if (month >= 3 && month <= 5) type = SeasonTypeValues.spring;
      else if (month >= 6 && month <= 8) type = SeasonTypeValues.summer;
      else if (month >= 9 && month <= 11) type = SeasonTypeValues.fall;
      else type = SeasonTypeValues.winter;
      return { type, year };
    } catch (e) {
      console.log('Error deriving season meta from startDate: ', e);
      return { type: SeasonTypeValues.spring, year: new Date().getFullYear() };
    }
  },
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
      status: SeasonStatusValues.archived,
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
        entityType: AuditEntity.Season,
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
      return allSeasons.filter(s => s.status === SeasonStatusValues.active);
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
      // Prevent duplicate season names or duplicate seasonType+year
      const existing = await this.getSeasons();
      const nameNorm = (formData.name || '').trim().toLowerCase();
      if (nameNorm) {
        const dupByName = existing.find(s => (s.name || '').trim().toLowerCase() === nameNorm);
        if (dupByName) throw new Error('A season with that name already exists');
      }
      // derive candidate type/year from startDate or provided fields
      let candidateType: SeasonType | undefined = undefined;
      let candidateYear: number | undefined = undefined;
      if ((formData as any).startDate) {
        const meta = (this as any).deriveSeasonMeta((formData as any).startDate as string);
        candidateType = meta.type;
        candidateYear = meta.year;
      } else if ((formData as any).seasonType && (formData as any).year) {
        candidateType = (formData as any).seasonType as SeasonType;
        candidateYear = (formData as any).year as number;
      }
      if (candidateType && candidateYear) {
        const dupByTypeYear = existing.find(s => s.seasonType === candidateType && s.year === candidateYear);
        if (dupByTypeYear) throw new Error('A season with that type and year already exists');
      }
      const now = new Date().toISOString();
      const newSeasonRef = ref(db, `seasons/${Date.now()}`);
      const seasonId = newSeasonRef.key!;
      // Remove undefined or empty string fields to avoid Firebase set errors
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== undefined && v !== '')
      );

      // derive season meta from startDate if present
      let derived: any = {};
      if (cleanedData.startDate) {
        const meta = (this as any).deriveSeasonMeta(cleanedData.startDate as string);
        derived.seasonType = meta.type;
        derived.year = meta.year;
      }
      const seasonData: Season = {
        id: seasonId,
        ...(cleanedData as any),
        ...derived,
        status: (cleanedData as any).status || SeasonStatusValues.active,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      };

      await set(newSeasonRef, seasonData);
      try {
        await auditLogService.log({
          action: 'season.created',
          entityType: AuditEntity.Season,
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
      // Prevent duplicate name or duplicate seasonType+year when updating
      const existing = await this.getSeasons();
      if ((updates as any).name) {
        const nameNorm = ((updates as any).name || '').trim().toLowerCase();
        const dup = existing.find(s => s.id !== seasonId && (s.name || '').trim().toLowerCase() === nameNorm);
        if (dup) throw new Error('A season with that name already exists');
      }
      // Determine candidate type/year after applying updates
      let candidateType: SeasonType | undefined = undefined;
      let candidateYear: number | undefined = undefined;
      if ((updates as any).startDate) {
        const meta = (this as any).deriveSeasonMeta((updates as any).startDate as string);
        candidateType = meta.type;
        candidateYear = meta.year;
      } else if ((updates as any).seasonType && (updates as any).year) {
        candidateType = (updates as any).seasonType as SeasonType;
        candidateYear = (updates as any).year as number;
      } else {
        // fall back to existing season values
        const current = await this.getSeasonById(seasonId);
        if (current) {
          candidateType = (updates as any).seasonType ?? current.seasonType;
          candidateYear = (updates as any).year ?? current.year;
        }
      }
      if (candidateType && candidateYear) {
        const dupByTypeYear = existing.find(s => s.id !== seasonId && s.seasonType === candidateType && s.year === candidateYear);
        if (dupByTypeYear) throw new Error('A season with that type and year already exists');
      }
      const seasonRef = ref(db, `seasons/${seasonId}`);
      const cleaned = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
      );

      // derive season meta if startDate provided
      const toWrite: any = { ...(cleaned as any), updatedAt: new Date().toISOString() };
      if ((cleaned as any).startDate) {
        const meta = (this as any).deriveSeasonMeta((cleaned as any).startDate as string);
        toWrite.seasonType = meta.type;
        toWrite.year = meta.year;
      }

      await update(seasonRef, toWrite);
      try {
        await auditLogService.log({
          action: 'season.updated',
          entityType: AuditEntity.Season,
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
      await this.updateSeason(seasonId, { status: SeasonStatusValues.archived });
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
        await auditLogService.logDelete(AuditEntity.Season, seasonId, seasonData, actorId ?? undefined);
      } catch (e) {
        console.error('Error auditing season.delete:', e);
      }
    } catch (error) {
      console.error('Error deleting season:', error);
      throw error;
    }
  },
};
