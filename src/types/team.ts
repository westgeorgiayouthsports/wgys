import { SportType } from "./program";

export interface Tournament {
  id?: string;
  name: string;
  start: string; // ISO date
  end: string;   // ISO date
  fee: number;
}

export interface Equipment {
  id?: string;
  item: string;
  cost: number;
}

export interface Uniform {
  id?: string;
  item: string;
  cost: number;
}

export interface Insurance {
  id?: string;
  item: string;
  cost: number;
}

export interface Training {
  id?: string;
  item: string;
  cost: number;
}

export interface Team {
  id: string;
  userId: string;
  name: string;
  sport: SportType;
  season: number;
  rosterSize: number;
  tournaments: Tournament[];
  equipment: Equipment[];
  uniforms: Uniform[];
  insurance: Insurance[];
  training: Training[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamDocument extends Omit<Team, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  tournamentTotal: number;
  equipmentTotal: number;
  uniformsTotal: number;
  uniformsPerPlayer: number;
  insuranceTotal: number;
  trainingTotal: number;
  operationsTotal: number;
  grandTotal: number;
  perPlayerCost: number;
  tournamentPercent: number;
  operationsPercent: number;
}

export interface TeamsState {
  teams: Team[];
  currentTeam: Team | null;
  loading: boolean;
  error: string | null;
}
