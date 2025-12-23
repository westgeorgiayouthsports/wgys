export type SeasonType = 'spring' | 'summer' | 'fall' | 'winter';
export type SeasonStatus = 'active' | 'archived';
export interface Season {
    id: string;
    name: string;
    seasonType: SeasonType;
    year: number;
    status: SeasonStatus;
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
