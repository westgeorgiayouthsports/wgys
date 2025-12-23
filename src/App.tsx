import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider, App as AntApp } from 'antd';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './services/firebase';
import { setUser, setLoading } from './store/slices/authSlice';
import type { RootState } from './store/store';
import { darkTheme, lightTheme } from './theme/themeConfig';
import Router from './Router';
import { setUserProperties } from './services/analytics';
import './App.css';
import './styles/theme-variables.css';

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
        console.warn('Geo check failed, default allow', err);
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
          console.warn('signOut after geo block failed', e);
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
            console.warn('Database read failed, using Firebase displayName:', err);
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
        } else {
          dispatch(setUser({ user: null, role: 'user' }));
        }
      } catch (error) {
        console.error('Auth error:', error);
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