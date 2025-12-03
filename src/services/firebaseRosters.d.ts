export interface Player {
    id: string;
    name: string;
    number: number;
    position: string;
    registrationId?: string;
    joinedAt: string;
}
export declare const rostersService: {
    getTeamRoster(teamId: string): Promise<Player[]>;
    addPlayer(teamId: string, name: string, number: number, position: string, registrationId?: string): Promise<Player>;
    updatePlayer(teamId: string, playerId: string, updates: Partial<Omit<Player, "id" | "joinedAt">>): Promise<void>;
    removePlayer(teamId: string, playerId: string): Promise<void>;
    getPlayerByNumber(teamId: string, number: number): Promise<Player | null>;
    getPlayersByPosition(teamId: string, position: string): Promise<Player[]>;
    linkRegistrationToPlayer(teamId: string, playerId: string, registrationId: string): Promise<void>;
};
