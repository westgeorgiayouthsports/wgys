import type { ProgramFormResponse } from '../types/programForm';
export interface ProgramRegistrationRecord {
    id: string;
    programId: string;
    programName?: string;
    athleteId?: string;
    playerName?: string;
    familyId?: string;
    registeredBy: string;
    responses: ProgramFormResponse[];
    status: 'cart' | 'pending' | 'confirmed' | 'cancelled';
    paymentMethod: string;
    paymentDisplay?: string;
    paymentPlan?: 'full' | 'plan';
    totalAmount: number;
    registrationDate: string;
    createdAt: string;
    updatedAt?: string;
}
export declare const programRegistrationsService: {
    createProgramRegistration(programId: string, registeredBy: string, responses: ProgramFormResponse[], totalAmount: number, paymentMethod: string, athleteId?: string, familyId?: string, paymentPlan?: "full" | "plan", extras?: Partial<Pick<ProgramRegistrationRecord, "programName" | "playerName" | "paymentDisplay">>): Promise<ProgramRegistrationRecord>;
    getProgramRegistration(id: string): Promise<ProgramRegistrationRecord>;
    getProgramRegistrationsByFamily(familyId: string): Promise<ProgramRegistrationRecord[]>;
    getProgramRegistrationsByAthlete(athleteId: string): Promise<ProgramRegistrationRecord[]>;
    getAllProgramRegistrations(): Promise<ProgramRegistrationRecord[]>;
};
