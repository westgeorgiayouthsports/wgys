export type SportType = 'baseball' | 'softball' | 'basketball' | 'soccer' | 'tennis' | 'other';
export type SexRestriction = 'male' | 'female' | 'coed';
export type ProgramType = 'sport' | 'lesson' | 'training' | 'tryout' | 'camp';

import type { ProgramQuestion } from './programForm';

export interface Program {
  id: string;
  name: string;
  sport: SportType;
  description: string;
  sexRestriction: SexRestriction;
  birthDateStart?: string; // Earliest allowed birth date (YYYY-MM-DD)
  birthDateEnd?: string; // Latest allowed birth date (YYYY-MM-DD)
  maxGrade?: number; // Maximum school grade (K=0, 1st=1, etc.)
  allowGradeExemption?: boolean; // Allow grade eligibility exemption
  status: 'active' | 'inactive';
  registrationStart: string;
  registrationEnd: string;
  basePrice: number;
  maxParticipants?: number;
  currentRegistrants: number;
  totalPayments: number;
  questions: ProgramQuestion[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProgramFormData {
  name: string;
  sport: SportType;
  type: ProgramType;
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