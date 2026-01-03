import type { QuestionType, SportType, ProgramRegistrationStatus, PaymentPlan, PaymentPlanFrequency, ProgramType, ProgramSex } from './enums/program';
import type { SeasonType } from './enums/season';
export type { QuestionType, SportType, ProgramRegistrationStatus, PaymentPlan, PaymentPlanFrequency, ProgramType };
export type SexRestriction = ProgramSex;

export interface ProgramQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[]; // For dropdown and checkboxes
  waiverText?: string; // For waiver type
  order: number;
}

export interface ProgramFormResponse {
  questionId: string;
  answer: string | string[] | boolean; // string for text, string[] for checkboxes, boolean for waiver
  fileUrl?: string; // For file uploads
}

export interface Program {
  id: string;
  name: string;
  templateId?: string;
  sport?: SportType;
  seasonId?: string; // Reference to Season document
  season?: SeasonType;
  year?: number;
  ageGroup?: string; // e.g., "10U", "12U"
  description: string;
  sexRestriction: SexRestriction;
  birthDateStart?: string; // Earliest allowed birth date (YYYY-MM-DD)
  birthDateEnd?: string; // Latest allowed birth date (YYYY-MM-DD)
  maxGrade?: number; // Maximum school grade (K=0, 1st=1, etc.)
  allowGradeExemption?: boolean; // Allow grade eligibility exemption
  active: boolean;
  registrationOpen: string;
  registrationClose: string;
  basePrice: number;
  maxParticipants?: number;
  currentRegistrants: number;
  totalPayments: number;
  questions: ProgramQuestion[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
// Note: canonical `Program` interface is defined above; no duplicate here.

export interface ProgramFormData {
  name: string;
  sport: SportType;
  templateId?: string;
  type: ProgramType;
  season?: SeasonType;
  seasonId?: string;
  year?: number;
  ageGroup?: string; // e.g., "10U", "12U"
  description: string;
  sexRestriction: SexRestriction;
  maxAge?: number;
  maxGrade?: number;
  minAge?: number;
  minGrade?: number;
  registrationDeadline?: string;
  startDate: string;
  endDate: string;
  cost: number;
  maxParticipants?: number;
}