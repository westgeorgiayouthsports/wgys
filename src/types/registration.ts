import type { ProgramRegistrationStatus } from './enums/program';
import type { PaymentStatus } from './enums/payments';

// Shared superset for registrations used across Person (nested) and Family (document)
export interface ProgramRegistration {
  // Optional document id (present on stored registration records)
  id?: string;

  // Program reference
  programId: string;
  programName?: string;
  season?: string;
  seasonId?: string;

  // Relational references
  familyId?: string;
  participantId?: string; // FamilyMember id or athlete id

  // Who registered and when
  registeredBy?: string; // user id
  registrationDate?: string; // ISO string
  registeredAt?: string; // alternate field used in some places

  // Status and payments
  status: ProgramRegistrationStatus;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;

  notes?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export type RegistrationDocument = ProgramRegistration;
