import { onCall, HttpsError } from 'firebase-functions/v2/https';
import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
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
// Initialize Admin SDK if not already (ESM modular API)
if (getApps().length === 0) {
    initializeApp();
}
/**
 * Create a Stripe SetupIntent for the authenticated user and return the client secret.
 * Ensures a Stripe Customer exists and is linked to users/{uid}/stripeCustomerId.
 */
export const createSetupIntent = onCall({ region: 'us-central1', secrets: ['STRIPE_SECRET_KEY'] }, async (request) => {
    try {
        const uid = request.auth?.uid;
        if (!uid) {
            throw new HttpsError('unauthenticated', 'Must be signed in to create a SetupIntent');
        }
        const stripe = getStripe();
        if (!stripe) {
            throw new HttpsError('failed-precondition', 'Stripe is not configured');
        }
        const db = getDatabase();
        const userRef = db.ref(`users/${uid}`);
        const snap = await userRef.get();
        const userData = snap.exists() ? snap.val() : {};
        let stripeCustomerId = userData?.stripeCustomerId;
        if (!stripeCustomerId) {
            // Fetch email/displayName from Auth
            const authUser = await getAuth().getUser(uid);
            try {
                const customer = await stripe.customers.create({
                    email: authUser.email || undefined,
                    name: authUser.displayName || undefined,
                    metadata: { firebaseUID: uid },
                });
                stripeCustomerId = customer.id;
                await userRef.update({ stripeCustomerId, updatedAt: new Date().toISOString() });
            }
            catch (stripeErr) {
                console.error('[createSetupIntent] Stripe customer creation failed:', stripeErr?.message || stripeErr);
                throw stripeErr;
            }
        }
        try {
            const setupIntent = await stripe.setupIntents.create({
                customer: stripeCustomerId,
                usage: 'off_session',
                payment_method_types: ['card'],
            });
            return { clientSecret: setupIntent.client_secret, customerId: stripeCustomerId };
        }
        catch (stripeErr) {
            console.error('[createSetupIntent] SetupIntent creation error code:', stripeErr?.code);
            console.error('[createSetupIntent] SetupIntent creation error type:', stripeErr?.type);
            console.error('[createSetupIntent] SetupIntent creation error message:', stripeErr?.message);
            console.error('[createSetupIntent] Full error:', JSON.stringify(stripeErr, null, 2));
            throw stripeErr;
        }
    }
    catch (err) {
        // Log full error for debugging in Cloud Function logs (do not expose secrets)
        console.error('createSetupIntent error:', err && err.stack ? err.stack : err);
        // Convert known HttpsError through, otherwise return a generic internal error
        if (err instanceof HttpsError)
            throw err;
        throw new HttpsError('internal', 'Failed to create SetupIntent');
    }
});
/**
 * Return sanitized PaymentMethod display data (brand, last4, exp) for the authenticated user.
 * Verifies the payment method belongs to the user's Stripe Customer.
 */
export const getPaymentMethodDisplay = onCall({ region: 'us-central1', secrets: ['STRIPE_SECRET_KEY'] }, async (request) => {
    try {
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
        const db = getDatabase();
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
    }
    catch (err) {
        console.error('getPaymentMethodDisplay error:', err && err.stack ? err.stack : err);
        if (err instanceof HttpsError)
            throw err;
        throw new HttpsError('internal', 'Failed to fetch payment method details');
    }
});
