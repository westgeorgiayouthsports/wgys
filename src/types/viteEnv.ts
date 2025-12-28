/// <reference types="vite/client" />

export interface ViteEnv {
	readonly [key: string]: string | boolean | number | undefined;
	readonly VITE_FIREBASE_API_KEY?: string;
	readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
	readonly VITE_FIREBASE_DATABASE_URL?: string;
	readonly VITE_FIREBASE_PROJECT_ID?: string;
	readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
	readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
	readonly VITE_FIREBASE_APP_ID?: string;
	readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
	readonly VITE_METRICS_URL?: string;
	readonly VITE_FIREBASE_GA4_PROPERTY_ID?: string;
	readonly VITE_GA4_API_SECRET?: string;
	readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_ENV?: 'development' | 'production' | 'test' | undefined;
}

declare global {
	const __VITE_ENV__: ViteEnv | undefined;
}

export default ViteEnv;
