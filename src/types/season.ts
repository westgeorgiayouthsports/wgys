import type { SeasonType, SeasonStatus } from './enums/season';
export type { SeasonType, SeasonStatus };

export interface Season {
  id: string;
  name: string; // e.g., "Spring 2026"
  seasonType: SeasonType; // 'spring'|'summer'|'fall'|'winter'
  year: number; // e.g., 2026
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string; // ISO date string YYYY-MM-DD
  fiscalYearStart?: string; // ISO date string
  fiscalYearEnd?: string; // ISO date string
  status: SeasonStatus; // 'draft' | 'active' | 'closed' | 'archived'
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
  // paymentPlans removed: payment plans are now global and configured separately
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface SeasonFormData {
  name: string;
  seasonType?: SeasonType;
  year?: number;
  startDate?: string;
  endDate?: string;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  description?: string;
  groupDiscounts?: Record<number, number>;
  discountCodes?: Array<{
    code: string;
    type?: 'fixed' | 'percent';
    amount: number;
    active?: boolean;
  }>;
}
