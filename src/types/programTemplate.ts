import type { ProgramType, ProgramSex } from './enums/program';

export interface ProgramTemplate {
  id: string;
  sportId: string;
  // divisionKey removed — base templates are not division-specific
  programType: ProgramType;
  sex?: ProgramSex;
  defaultMinAge?: number;
  defaultMaxAge?: number;
  defaultBaseFee?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonProgramInstance {
  programTemplateId: string;
  isOpenForRegistration?: boolean;
  registrationOpen?: string | null;
  registrationClose?: string | null;
  feeOverride?: number | null;
  waitlistEnabled?: boolean;
}

export type ProgramTemplatesMap = Record<string, ProgramTemplate>;
export type SeasonProgramsMap = Record<string, SeasonProgramInstance>;

export {};
