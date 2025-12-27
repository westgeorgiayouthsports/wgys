export interface PaymentPlan {
  id: string;
  name: string;
  active?: boolean;
  // amount due at checkout (dollars)
  initialAmount?: number;
  // number of equal installments after initial
  installments?: number;
  // day of month for subsequent payments (1-28)
  paymentDay?: number;
  // Optional Stripe linkage: a Price ID or Product ID depending on integration strategy
  stripePriceId?: string;
  stripeProductId?: string;
  // optional scoping
  seasonId?: string | null;
  programIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
}
