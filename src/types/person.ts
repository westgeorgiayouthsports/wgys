import type { ContactMethod, PersonRole, PersonSource, Sex } from './enums/person';
import type { ProgramRegistration } from './registration';
import type { TeamRole } from './enums/team';
import type { ThemeType } from './enums/theme';
export type { PersonRole, ContactMethod, ProgramRegistration, TeamRole, ThemeType as Theme };

export interface ContactPreference {
  method: ContactMethod;
  value: string;
  isPrimary?: boolean;
  isActive: boolean;
}

export interface TeamMembership {
  teamId: string;
  teamName: string;
  role: TeamRole;
  season: string;
  isActive: boolean;
}

export interface Person {
  id: string;

  // Basic Information
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  sex?: Sex;

  // Account Status
  hasAccount: boolean;
  userId?: string; // Firebase Auth UID

  // Profile Settings (for account holders)
  photoURL?: string;
  displayName?: string;
  themePreference?: ThemeType;

  // Family Roles (relationships)
  roles: PersonRole[];
  // System access level is stored separately in users table

  // Family
  familyId?: string;

  // Contact Information
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactPreferences: ContactPreference[];

  // Communication Groups
  groups: string[];

  // Sports-specific
  programs: ProgramRegistration[];
  teams: TeamMembership[];

  // School Information (for athletes)
  schoolName?: string;
  graduationYear?: number;

  // Metadata
  source: PersonSource;
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
  themePreference?: ThemeType;
  familyId?: string;
  userId?: string;
  hasAccount?: boolean;
}