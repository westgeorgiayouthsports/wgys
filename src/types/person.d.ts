export type PersonRole = 'parent' | 'guardian' | 'athlete' | 'coach' | 'volunteer' | 'grandparent' | 'relative' | 'other';
export type RelationshipType = 'parent' | 'child' | 'sibling' | 'guardian' | 'spouse' | 'grandparent' | 'other';
export type ContactMethod = 'email' | 'sms' | 'phone' | 'app';
export interface Relationship {
    personId: string;
    type: RelationshipType;
    isPrimary?: boolean;
}
export interface ContactPreference {
    method: ContactMethod;
    value: string;
    isPrimary?: boolean;
    isActive: boolean;
}
export interface ProgramRegistration {
    programId: string;
    programName: string;
    season: string;
    status: 'registered' | 'waitlist' | 'completed' | 'cancelled';
    registeredAt: string;
}
export interface TeamMembership {
    teamId: string;
    teamName: string;
    role: 'player' | 'coach' | 'assistant' | 'manager';
    season: string;
    isActive: boolean;
}
export interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    sex?: 'male' | 'female';
    hasAccount: boolean;
    userId?: string;
    photoURL?: string;
    displayName?: string;
    themePreference?: 'light' | 'dark';
    roles: PersonRole[];
    familyId?: string;
    relationships: Relationship[];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    contactPreferences: ContactPreference[];
    groups: string[];
    programs: ProgramRegistration[];
    teams: TeamMembership[];
    schoolName?: string;
    graduationYear?: number;
    source: 'signup' | 'manual' | 'import';
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    isActive: boolean;
}
export interface Family {
    id: string;
    name: string;
    primaryPersonId: string;
    memberIds: string[];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}
export interface PersonFormData {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    sex?: 'male' | 'female';
    roles: PersonRole[];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    schoolName?: string;
    graduationYear?: number;
    groups?: string[];
    photoURL?: string;
    displayName?: string;
    themePreference?: 'light' | 'dark';
}
