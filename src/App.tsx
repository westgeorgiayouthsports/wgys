import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider, App as AntApp } from 'antd';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './services/firebase';
import { ref as dbRef, update as dbUpdate } from 'firebase/database';
import { setUser, setLoading } from './store/slices/authSlice';
import type { RootState } from './store/store';
import { darkTheme, lightTheme } from './theme/themeConfig';
import Router from './Router';
import { setUserProperties } from './services/analytics';
import './App.css';
import './styles/theme-variables.css';
import { setTheme } from './store/slices/themeSlice';
import { setShowMyMenuItems, setDebugLogging } from './store/slices/uiSlice';
import logger from './utils/logger';

export default function App() {
  const [geoAllowed, setGeoAllowed] = useState<boolean | null>(null);
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.auth.loading);
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const user = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);

  // Set theme data attribute and body background
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = isDarkMode ? '#141414' : '#ffffff';
    document.body.style.color = isDarkMode ? '#ffffff' : '#000000';
  }, [isDarkMode]);

  // Geo gate: allow only North America (US, CA). Fail-open on lookup errors.
  // Use an AbortController so the fetch can be cancelled on unmount and
  // keep sign-out as a separate effect for safer async updates and easier testing.
  useEffect(() => {
    // In local dev skip external geo lookups to avoid CORS/rate-limit issues
    // and to speed up developer experience.
    // Vite exposes `import.meta.env.DEV` as a boolean during development.

    if (process.env.NODE_ENV === 'development') {
      setGeoAllowed(true);
      return;
    }
    const controller = new AbortController();
    // Fail-open quickly if geo lookup is slow: abort after 3s to avoid blocking UI/tests
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    let cancelled = false;
    const checkGeo = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        if (!res.ok) throw new Error(`geo lookup failed ${res.status}`);
        const data = await res.json();
        const country = (data.country_code || '').toUpperCase();
        const allowed = ['US', 'CA'];
        const ok = allowed.includes(country);
        if (!cancelled) {
          setGeoAllowed(ok);
        }
      } catch (err: any) {
        if (err && err.name === 'AbortError') return; // expected on unmount
        logger.error('Geo check failed, default allow', err);
        if (!cancelled) setGeoAllowed(true); // fail-open to avoid accidental lockout
      }
    };
    checkGeo();
    return () => { cancelled = true; controller.abort(); clearTimeout(timeoutId); };
  }, []);

  // When geo check determines access is blocked, perform sign-out as a separate
  // side-effect. Keeping this separate avoids doing auth side-effects inside the
  // same async function that updates React state and makes the flow easier to
  // test and reason about.
  useEffect(() => {
    if (geoAllowed === false) {
      (async () => {
        try {
          await auth.signOut();
        } catch (e) {
          logger.error('signOut after geo block failed', e);
        }
      })();
    }
  }, [geoAllowed]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Try to get Firestore data with timeout
          let displayName = 'User';
          let role = 'user';

          try {
            const userRef = ref(db, `users/${firebaseUser.uid}`);
            const userSnapshot = await get(userRef);

            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              displayName = userData.displayName || 'User';
              role = userData.role || 'user';
            }
          } catch (err) {
            logger.error('Database read failed, using Firebase displayName:', err);
            displayName = firebaseUser.displayName || 'User';
          }

          const enhancedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName,
            photoURL: firebaseUser.photoURL,
          };

          dispatch(
            setUser({
              user: enhancedUser,
              role,
              createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : undefined,
            })
          );

          // Migrate legacy localStorage preferences into RTDB under users/{uid}/preferences
          try {
            const prefsToWrite: Record<string, any> = {};
            // migrate sidebar preference
            try {
              const v = localStorage.getItem('wgys.showMyMenuItems');
              if (v === '0' || v === '1') prefsToWrite.showMyMenuItems = v === '1';
            } catch (e) { logger.error('reading localStorage wgys.showMyMenuItems failed', e); }
            // migrate theme preference
            try {
              const t = localStorage.getItem('theme');
              if (t === 'dark' || t === 'light') prefsToWrite.theme = t;
            } catch (e) { logger.error('reading localStorage theme failed', e); }

            if (Object.keys(prefsToWrite).length > 0) {
              const prefRef = dbRef(db, `users/${firebaseUser.uid}/preferences`);
              await dbUpdate(prefRef, prefsToWrite);
              // remove migrated keys
              try { localStorage.removeItem('wgys.showMyMenuItems'); } catch (e) { logger.error('removing localStorage wgys.showMyMenuItems failed', e); }
              try { localStorage.removeItem('theme'); } catch (e) { logger.error('removing localStorage theme failed', e); }
            }
          } catch (e) {
            logger.error('Preference migration to RTDB failed', e);
          }
          // Load preferences from RTDB and apply to store
          try {
            const prefRef = dbRef(db, `users/${firebaseUser.uid}/preferences`);
            const prefSnap = await get(prefRef);
            if (prefSnap.exists()) {
              const prefs = prefSnap.val();
              // Apply well-known preferences into the store and also cache them for fast access
              if (prefs.theme) {
                dispatch(setTheme(prefs.theme === 'dark'));
                try { localStorage.setItem('wgys.theme', prefs.theme); } catch (e) { logger.error('failed to cache theme locally', e); }
              }
              if (typeof prefs.showMyMenuItems !== 'undefined') {
                dispatch(setShowMyMenuItems(!!prefs.showMyMenuItems));
                try { localStorage.setItem('wgys.showMyMenuItems', prefs.showMyMenuItems ? '1' : '0'); } catch (e) { logger.error('failed to cache showMyMenuItems locally', e); }
              }
              if (typeof prefs.debugLogging !== 'undefined') {
                try { localStorage.setItem('wgys.debugLogging', prefs.debugLogging ? '1' : '0'); } catch (e) { logger.error('failed to cache debugLogging locally', e); }
                try { dispatch(setDebugLogging(!!prefs.debugLogging)); } catch (e) { logger.error('failed to set debugLogging in store', e);}
              }

              // Cache any other preferences under wgys.pref.<key> for quick local reads
              try {
                Object.keys(prefs).forEach((k) => {
                  try {
                    const v = prefs[k];
                    // Store primitives as-is for readability; serialize objects
                    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                      localStorage.setItem(`wgys.pref.${k}`, String(v));
                    } else {
                      localStorage.setItem(`wgys.pref.${k}`, JSON.stringify(v));
                    }
                  } catch (inner) {
                    logger.error(`failed to cache preference ${k} locally`, inner);
                  }
                });
              } catch (e) {
                logger.error('failed to iterate preferences for caching', e);
              }
            }
          } catch (e) {
            logger.error('Failed to load user preferences from RTDB', e);
          }

          // In local development, log id token result and claims to help debugging RTDB rules/claims
          // Only run in DEV to avoid leaking tokens in production

          if (process.env.NODE_ENV === 'development') {
            try {
              const idRes = await firebaseUser.getIdTokenResult();
              logger.info('DEBUG: idTokenClaims:', idRes.claims);
              // For deeper debugging, you can also log the raw token (DEV only)
              const rawToken = await firebaseUser.getIdToken();
              logger.info('DEBUG: idToken (DEV only):', rawToken);
            } catch (tokErr) {
              logger.error('Failed to fetch id token for debug logging', tokErr);
            }
          }
        } else {
          dispatch(setUser({ user: null, role: 'user' }));
        }
      } catch (error) {
        logger.error('Auth error:', error);
        dispatch(setUser({ user: null, role: 'user' }));
      } finally {
        dispatch(setLoading(false));
      }
    });

    return () => { unsubscribe(); };
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;
    setUserProperties({ role, user_id: user.uid });
  }, [role, user]);

  if (loading || geoAllowed === null) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (geoAllowed === false) {
    return (
      <div className="loading-screen" style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Access not available in your region</h2>
        <p style={{ marginTop: '12px', color: '#888' }}>This site is restricted to North America (US/CA).</p>
      </div>
    );
  }

  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <AntApp>
        <Router />
      </AntApp>
    </ConfigProvider>
  );
}