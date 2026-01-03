import type { SeasonType, SeasonStatus } from './enums/season';
export type { SeasonType, SeasonStatus };

export interface Season {
  id: string;
  name: string; // e.g., "Spring 2026"
  seasonType: SeasonType; // 'spring'|'summer'|'fall'|'winter'
  year: number; // e.g., 2026
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string; // ISO date string YYYY-MM-DD
  registrationOpen?: string; // ISO date string YYYY-MM-DD
  registrationClose?: string; // ISO date string YYYY-MM-DD
  status: SeasonStatus; // 'draft' | 'active' | 'closed' | 'archived'
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SeasonFormData {
  name: string;
  seasonType?: SeasonType;
  year?: number;
  startDate?: string;
  endDate?: string;
  registrationOpen?: string;
  registrationClose?: string;
  description?: string;
}
