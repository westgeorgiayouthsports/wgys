import Stripe from 'stripe';
const key = process.env.STRIPE_SECRET_KEY;
console.log('KEY prefix:', key?.substring(0, 7), 'len:', key?.length);
const s = new Stripe(key);
(async () => {
  try {
    const cu = await s.customers.create({ description: 'local test' });
    console.log('Customer created:', cu.id);
  } catch (err) {
    console.error('Local Stripe error:', err);
  }
})();