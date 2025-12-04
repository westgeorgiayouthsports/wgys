export interface Team {
    id: string;
    name: string;
    budget: number;
    spent: number;
    status: 'active' | 'inactive';
    userId: string;
    createdAt: string;
    coachId?: string;
}
export interface TeamsState {
    teams: Team[];
    loading: boolean;
    error: string | null;
}
export declare const setLoading: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<boolean, "teams/setLoading">, setTeams: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Team[], "teams/setTeams">, addTeam: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Team, "teams/addTeam">, updateTeam: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Team, "teams/updateTeam">, deleteTeam: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "teams/deleteTeam">, setError: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "teams/setError">;
declare const _default: import("redux").Reducer<TeamsState>;
export default _default;
