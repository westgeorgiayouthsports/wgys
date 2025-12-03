export type RelationshipType = 'parent' | 'guardian' | 'child' | 'sibling' | 'grandparent' | 'other';
export type Sex = 'male' | 'female' | 'other';
export interface FamilyMember {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: Sex;
    grade?: number;
    schoolName?: string;
    graduationYear?: number;
    email?: string;
    phone?: string;
    relationship: RelationshipType;
    isPrimary: boolean;
    userId?: string;
    contactId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Family {
    id: string;
    name: string;
    primaryMemberId: string;
    members: FamilyMember[];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}
export interface Registration {
    id: string;
    programId: string;
    familyId: string;
    participantId: string;
    registeredBy: string;
    registrationDate: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'waitlist';
    paymentStatus: 'pending' | 'paid' | 'refunded';
    paymentAmount: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
