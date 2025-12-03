export interface Registration {
    id: string;
    teamId: string;
    playerName: string;
    playerAge: number;
    playerPosition?: string;
    parentName: string;
    parentEmail: string;
    phoneNumber: string;
    fee: number;
    paymentMethod: 'stripe' | 'paypal' | 'square' | 'check' | 'cash';
    status: 'pending' | 'approved' | 'paid';
    rosterPlayerId?: string;
    createdAt: string;
    updatedAt?: string;
}
export declare const registrationsService: {
    getTeamRegistrations(teamId: string): Promise<Registration[]>;
    getAllRegistrations(): Promise<Registration[]>;
    createRegistration(teamId: string, playerName: string, playerAge: number, playerPosition: string | undefined, parentName: string, parentEmail: string, phoneNumber: string, fee: number, paymentMethod: "stripe" | "paypal" | "square" | "check" | "cash"): Promise<Registration>;
    updateRegistration(id: string, updates: Partial<Omit<Registration, "id">>): Promise<void>;
    approveRegistration(id: string, rosterPlayerId?: string): Promise<void>;
    markAsPaid(id: string): Promise<void>;
    deleteRegistration(id: string): Promise<void>;
    getRegistrationsByStatus(teamId: string, status: "pending" | "approved" | "paid"): Promise<Registration[]>;
};
