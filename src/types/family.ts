import type { PersonRole, Sex } from './enums/person';
import type { PaymentStatus } from './enums/payment';
import type { ProgramRegistration } from './registration';
export type { PersonRole, PaymentStatus, ProgramRegistration };

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  grade?: number; // School grade (K=0, 1st=1, etc.)
  schoolName?: string;
  graduationYear?: number;
  email?: string;
  phone?: string;
  role: PersonRole;
  isPrimary: boolean; // Primary account holder
  userId?: string; // Link to user account if they have one
  contactId?: string; // Link to contact record
  createdAt: string;
  updatedAt: string;
}

export interface Family {
  id: string;
  name: string; // Family name or identifier
  primaryMemberId: string; // ID of primary family member
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

export type Registration = ProgramRegistration & { id: string; familyId?: string };