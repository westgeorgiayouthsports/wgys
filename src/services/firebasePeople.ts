import { ref, push, get, update, remove, set, query as _query, orderByChild as _orderByChild } from 'firebase/database';
import { db } from './firebase';
import { auditLogService } from './auditLog';
import { AuditEntity } from '../types/enums';
import type { Person, PersonFormData, Family } from '../types/person';

export const peopleService = {
  // Person CRUD operations
  async createPerson(data: PersonFormData, createdBy: string): Promise<string> {
    const peopleRef = ref(db, 'people');
    const newPersonRef = push(peopleRef);

    // Filter out undefined values to prevent Firebase update errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    const person: any = {
      ...cleanData,
      roles: cleanData.roles || [],
      hasAccount: false,
      relationships: [],
      contactPreferences: [],
      programs: [],
      teams: [],
      groups: data.groups || [],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      isActive: true,
    };

    await update(newPersonRef, person);
    try {
      await auditLogService.log({ action: 'person.created', entityType: AuditEntity.Person, entityId: newPersonRef.key, details: person });
    } catch (e) {
      console.error('Error auditing person.created:', e);
    }
    return newPersonRef.key;
  },

  async getPeople(): Promise<Person[]> {
    const peopleRef = ref(db, 'people');
    const snapshot = await get(peopleRef);

    if (!snapshot.exists()) return [];

    const peopleData = snapshot.val();
    return Object.entries(peopleData).map(([id, data]) => ({
      id,
      ...(data as Omit<Person, 'id'>),
      roles: (data as any).roles || [],
    }));
  },

  async getPersonById(id: string): Promise<Person | null> {
    const personRef = ref(db, `people/${id}`);
    const snapshot = await get(personRef);

    if (!snapshot.exists()) return null;

    const val = snapshot.val();
    return {
      id,
      ...val,
      roles: (val as any).roles || [],
    };
  },

  async updatePerson(id: string, data: Partial<PersonFormData>): Promise<void> {
    const personRef = ref(db, `people/${id}`);

    // Filter out undefined values to prevent Firebase update errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    await update(personRef, {
      ...cleanData,
      updatedAt: new Date().toISOString(),
    });
    try {
      await auditLogService.log({ action: 'person.updated', entityType: AuditEntity.Person, entityId: id, details: cleanData });
    } catch (e) {
      console.error('Error auditing person.updated:', e);
    }
  },

  async deletePerson(id: string): Promise<void> {
    try {
      const personRef = ref(db, `people/${id}`);
      const snap = await get(personRef);
      const before = snap.exists() ? snap.val() : null;
      await remove(personRef);
      try {
        await auditLogService.logDelete(AuditEntity.Person, id, before);
      } catch (e) {
        console.error('Error auditing person.delete:', e);
      }
    } catch (error) {
      console.error('Error deleting person:', error);
      throw error;
    }
  },

  async linkPersonToAccount(personId: string, userId: string): Promise<void> {
    const personRef = ref(db, `people/${personId}`);
    await update(personRef, {
      hasAccount: true,
      userId,
      updatedAt: new Date().toISOString(),
    });
    try {
      const mappingRef = ref(db, `users_to_person/${userId}`);
      await set(mappingRef, personId);
    } catch (e) {
      console.error('Failed to write users_to_person mapping:', e);
    }
  },

  // Family operations
  async createFamily(name: string, primaryPersonId: string, createdBy: string): Promise<string> {
    const familiesRef = ref(db, 'families');
    const newFamilyRef = push(familiesRef);

    const family: Omit<Family, 'id'> = {
      name,
      primaryPersonId,
      memberIds: [primaryPersonId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
    };

    await update(newFamilyRef, family);
    try {
      await auditLogService.log({ action: 'family.created', entityType: AuditEntity.Family, entityId: newFamilyRef.key, details: family });
    } catch (e) {
      console.error('Error auditing family.created:', e);
    }

    // Update person with family ID
    const personRef = ref(db, `people/${primaryPersonId}`);
    await update(personRef, {
      familyId: newFamilyRef.key,
      updatedAt: new Date().toISOString(),
    });

    return newFamilyRef.key;
  },

  async getFamilies(): Promise<Family[]> {
    const familiesRef = ref(db, 'families');
    const snapshot = await get(familiesRef);

    if (!snapshot.exists()) return [];

    const familiesData = snapshot.val();
    return Object.entries(familiesData).map(([id, data]) => ({
      id,
      ...(data as Omit<Family, 'id'>),
    }));
  },

  async addPersonToFamily(familyId: string, personId: string): Promise<void> {
    const familyRef = ref(db, `families/${familyId}`);
    const familySnapshot = await get(familyRef);

    if (familySnapshot.exists()) {
      const family = familySnapshot.val();
      const updatedMemberIds = [...(family.memberIds || []), personId];

      await update(familyRef, {
        memberIds: updatedMemberIds,
        updatedAt: new Date().toISOString(),
      });

      // Update person with family ID
      const personRef = ref(db, `people/${personId}`);
      await update(personRef, {
        familyId,
        updatedAt: new Date().toISOString(),
      });
      try {
        await auditLogService.log({ action: 'family.member_added', entityType: AuditEntity.Family, entityId: familyId, details: { memberId: personId } });
      } catch (e) {
        console.error('Error auditing family.member_added:', e);
      }
    }
  },

  // Query helpers
  async getPeopleByRole(role: string): Promise<Person[]> {
    const people = await this.getPeople();
    return people.filter(person => (person.roles || []).includes(role as any));
  },

  async getPeopleWithAccounts(): Promise<Person[]> {
    const people = await this.getPeople();
    return people.filter(person => person.hasAccount);
  },

  async getPeopleByFamily(familyId: string): Promise<Person[]> {
    const people = await this.getPeople();
    return people.filter(person => person.familyId === familyId);
  },

  async updatePersonProfile(personId: string, profileData: { displayName?: string; photoURL?: string; themePreference?: import('../types/enums/theme').ThemeType }): Promise<void> {
    const personRef = ref(db, `people/${personId}`);
    await update(personRef, {
      ...profileData,
      updatedAt: new Date().toISOString(),
    });
  },

  async getPersonByUserId(userId: string): Promise<Person | null> {
    const people = await this.getPeople();
    return people.find(person => person.userId === userId) || null;
  },
};