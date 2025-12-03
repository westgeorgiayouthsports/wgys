import type { Family, Registration } from '../types/family';
export declare const familiesService: {
    getFamilies(): Promise<Family[]>;
    getFamilyByUserId(userId: string): Promise<Family | null>;
    createFamily(familyData: Omit<Family, "id" | "createdAt" | "updatedAt">, createdBy: string): Promise<string>;
    updateFamily(familyId: string, familyData: Partial<Family>): Promise<void>;
    getRegistrations(): Promise<Registration[]>;
    createRegistration(registrationData: Omit<Registration, "id" | "createdAt" | "updatedAt">): Promise<string>;
};
