import type { SeasonType } from '../../types/season';
export interface Team {
    id: string;
    name: string;
    budget: number;
    spent: number;
    status: 'active' | 'inactive' | 'archived';
    userId: string;
    createdAt: string;
    updatedAt?: string;
    archivedAt?: string;
    coachId?: string;
    teamManagerId?: string;
    assistantCoachIds?: string[];
    rosterAthleteIds?: string[];
    programId?: string;
    seasonId?: string;
    season?: SeasonType;
    year?: number;
    ageGroup?: string;
}
export interface TeamsState {
    teams: Team[];
    loading: boolean;
    error: string | null;
}
export declare const setLoading: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<boolean, "teams/setLoading">, setTeams: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Team[], "teams/setTeams">, addTeam: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Team, "teams/addTeam">, updateTeam: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Team, "teams/updateTeam">, deleteTeam: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "teams/deleteTeam">, setError: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "teams/setError">;
declare const _default: import("redux").Reducer<TeamsState>;
export default _default;
