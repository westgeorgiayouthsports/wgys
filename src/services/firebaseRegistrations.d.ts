export interface TeamAssignment {
    id: string;
    teamId: string;
    playerName: string;
    playerAge: number;
    playerPosition?: string;
    parentName: string;
    parentEmail: string;
    phoneNumber: string;
    fee: number;
    paymentMethod: 'stripe' | 'paypal' | 'square' | 'check' | 'cash' | 'venmo' | 'cashapp' | 'other';
    status: 'pending' | 'approved' | 'paid';
    rosterPlayerId?: string;
    createdAt: string;
    updatedAt?: string;
}
export type Registration = TeamAssignment;
export declare const registrationsService: {
    getTeamRegistrations(teamId: string): Promise<TeamAssignment[]>;
    getAllRegistrations(): Promise<TeamAssignment[]>;
    createRegistration(teamId: string, playerName: string, playerAge: number, playerPosition: string | undefined, parentName: string, parentEmail: string, phoneNumber: string, fee: number, paymentMethod: "stripe" | "paypal" | "square" | "check" | "cash" | "venmo" | "cashapp" | "other"): Promise<TeamAssignment>;
    updateRegistration(id: string, updates: Partial<Omit<Registration, "id">>): Promise<void>;
    approveRegistration(id: string, rosterPlayerId?: string): Promise<void>;
    markAsPaid(id: string): Promise<void>;
    deleteRegistration(id: string): Promise<void>;
    getRegistrationsByStatus(teamId: string, status: "pending" | "approved" | "paid"): Promise<TeamAssignment[]>;
};
