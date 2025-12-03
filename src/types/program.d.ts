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
    birthDateStart?: string;
    birthDateEnd?: string;
    maxGrade?: number;
    allowGradeExemption?: boolean;
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
