export interface Event {
    id: string;
    teamId: string;
    title: string;
    type: 'practice' | 'game' | 'tournament';
    date: string;
    location: string;
    description: string;
    createdAt: string;
    updatedAt?: string;
}
export declare const eventsService: {
    getTeamEvents(teamId: string): Promise<Event[]>;
    getAllEvents(): Promise<Event[]>;
    createEvent(teamId: string, title: string, type: "practice" | "game" | "tournament", date: string, location: string, description: string): Promise<Event>;
    updateEvent(id: string, updates: Partial<Omit<Event, "id">>): Promise<void>;
    deleteEvent(id: string): Promise<void>;
};
