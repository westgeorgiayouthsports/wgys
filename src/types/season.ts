import type { SeasonType } from './enums/season';
export type { SeasonType };
export type SeasonStatus = 'active' | 'archived';

export interface Season {
  id: string;
  name: string; // e.g., "Spring 2026"
  seasonType: SeasonType; // 'spring' or 'fall'
  year: number; // e.g., 2026
  status: SeasonStatus; // 'active' or 'archived'
  description?: string;
  // group discounts: map of registration position -> fixed amount in cents (or dollars as number)
  // e.g., { 2: 10, 3: 10 } means $10 off 2nd and 3rd registrations
  groupDiscounts?: Record<number, number>;
  // discount codes valid for this season
  discountCodes?: Array<{
    code: string;
    type?: 'fixed' | 'percent';
    amount: number; // fixed dollar amount or percent value
    active?: boolean;
  }>;
  // payment plans available for this season
  paymentPlans?: Array<{
    id: string;
    name: string;
    active?: boolean;
    // initial payment due at checkout (dollars)
    initialAmount?: number;
    // number of additional equal installments (integer)
    installments?: number;
    // day of month when subsequent payments are due (1-28)
    paymentDay?: number;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SeasonFormData {
  name: string;
  seasonType: SeasonType;
  year: number;
  description?: string;
  groupDiscounts?: Record<number, number>;
  discountCodes?: Array<{
    code: string;
    type?: 'fixed' | 'percent';
    amount: number;
    active?: boolean;
  }>;
  paymentPlans?: Array<{
    id: string;
    name: string;
    active?: boolean;
    initialAmount?: number;
    installments?: number;
    paymentDay?: number;
  }>;
}
