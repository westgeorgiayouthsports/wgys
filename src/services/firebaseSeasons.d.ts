import type { Season, SeasonFormData } from '../types/season';
export declare const seasonsService: {
    getSeasons(): Promise<Season[]>;
    archiveSeasonCascade(seasonId: string, actorId?: string): Promise<void>;
    getActiveSeasons(): Promise<Season[]>;
    getSeasonById(seasonId: string): Promise<Season | null>;
    createSeason(formData: SeasonFormData, userId: string): Promise<string>;
    updateSeason(seasonId: string, updates: Partial<Season>, actorId?: string): Promise<void>;
    archiveSeason(seasonId: string): Promise<void>;
    deleteSeason(seasonId: string, actorId?: string): Promise<void>;
};
