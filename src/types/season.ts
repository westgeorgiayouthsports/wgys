import type { SeasonType } from './enums/season';
export type { SeasonType };
export type SeasonStatus = 'active' | 'archived';

export interface Season {
  id: string;
  name: string; // e.g., "Spring 2026"
  seasonType: SeasonType; // 'spring' or 'fall'
  year: number; // e.g., 2026
  status: SeasonStatus; // 'active' or 'archived'
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SeasonFormData {
  name: string;
  seasonType: SeasonType;
  year: number;
  description?: string;
}
