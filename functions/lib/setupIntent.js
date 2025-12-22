import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
// Lazily read the secret at runtime so Firebase analyzer doesn't fail when env is absent
let stripeClient = null;
function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret)
    return null;
  if (!stripeClient) {
    stripeClient = new Stripe(secret);
  }
  return stripeClient;
}
// Initialize Admin if not already
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}
catch {
  // ignore app already initialized error
  console.log("Admin already initialized");
}
/**
 * Create a Stripe SetupIntent for the authenticated user and return the client secret.
 * Ensures a Stripe Customer exists and is linked to users/{uid}/stripeCustomerId.
 */
export const createSetupIntent = onCall({ region: 'us-central1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in to create a SetupIntent');
  }
  const stripe = getStripe();
  if (!stripe) {
    throw new HttpsError('failed-precondition', 'Stripe is not configured');
  }
  const db = admin.database();
  const userRef = db.ref(`users/${uid}`);
  const snap = await userRef.get();
  const userData = snap.exists() ? snap.val() : {};
  let stripeCustomerId = userData?.stripeCustomerId;
  if (!stripeCustomerId) {
    // Fetch email/displayName from Auth
    const authUser = await admin.auth().getUser(uid);
    const customer = await stripe.customers.create({
      email: authUser.email || undefined,
      name: authUser.displayName || undefined,
      metadata: { firebaseUID: uid },
    });
    stripeCustomerId = customer.id;
    await userRef.update({ stripeCustomerId, updatedAt: new Date().toISOString() });
  }
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: 'off_session',
    payment_method_types: ['card'],
  });
  return { clientSecret: setupIntent.client_secret, customerId: stripeCustomerId };
});
/**
 * Return sanitized PaymentMethod display data (brand, last4, exp) for the authenticated user.
 * Verifies the payment method belongs to the user's Stripe Customer.
 */
export const getPaymentMethodDisplay = onCall({ region: 'us-central1' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in to read payment method details');
  }
  const stripe = getStripe();
  if (!stripe) {
    throw new HttpsError('failed-precondition', 'Stripe is not configured');
  }
  const paymentMethodId = request.data?.paymentMethodId || '';
  if (!paymentMethodId) {
    throw new HttpsError('invalid-argument', 'paymentMethodId is required');
  }
  const db = admin.database();
  const userRef = db.ref(`users/${uid}`);
  const snap = await userRef.get();
  const userData = snap.exists() ? snap.val() : {};
  const stripeCustomerId = userData?.stripeCustomerId;
  if (!stripeCustomerId) {
    throw new HttpsError('failed-precondition', 'Stripe customer not linked to user');
  }
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  // Ensure ownership
  const pmCustomer = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
  if (pmCustomer !== stripeCustomerId) {
    throw new HttpsError('permission-denied', 'Payment method does not belong to this user');
  }
  return {
    brand: pm.card?.brand?.toUpperCase() || 'CARD',
    last4: pm.card?.last4 || '',
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
  };
});
