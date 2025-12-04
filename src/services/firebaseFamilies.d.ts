import type { Family } from '../types/person';
export declare const familiesService: {
    getFamilies(): Promise<Family[]>;
    getFamily(familyId: string): Promise<Family | null>;
    createFamily(family: Omit<Family, "id">): Promise<string>;
    updateFamily(familyId: string, updates: Partial<Family>): Promise<void>;
    deleteFamily(familyId: string): Promise<void>;
};
