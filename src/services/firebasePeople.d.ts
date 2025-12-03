import type { Person, PersonFormData, Family } from '../types/person';
export declare const peopleService: {
    createPerson(data: PersonFormData, createdBy: string): Promise<string>;
    getPeople(): Promise<Person[]>;
    getPersonById(id: string): Promise<Person | null>;
    updatePerson(id: string, data: Partial<PersonFormData>): Promise<void>;
    deletePerson(id: string): Promise<void>;
    linkPersonToAccount(personId: string, userId: string): Promise<void>;
    createFamily(name: string, primaryPersonId: string, createdBy: string): Promise<string>;
    getFamilies(): Promise<Family[]>;
    addPersonToFamily(familyId: string, personId: string): Promise<void>;
    getPeopleByRole(role: string): Promise<Person[]>;
    getPeopleWithAccounts(): Promise<Person[]>;
    getPeopleByFamily(familyId: string): Promise<Person[]>;
    updatePersonProfile(personId: string, profileData: {
        displayName?: string;
        photoURL?: string;
        themePreference?: "light" | "dark";
    }): Promise<void>;
    getPersonByUserId(userId: string): Promise<Person | null>;
};
