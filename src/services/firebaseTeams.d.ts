import type { Team } from '../store/slices/teamsSlice';
export declare const teamsService: {
    getTeams(): Promise<Team[]>;
    getUserTeams(_userId: string): Promise<Team[]>;
    createTeam(team: Omit<Team, "id">): Promise<Team>;
    updateTeam(id: string, updates: Partial<Team>): Promise<void>;
    deleteTeam(id: string): Promise<void>;
    getTeamById(id: string): Promise<Team | null>;
    getTeamsByProgram(programId: string): Promise<Team[]>;
};
