import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider, App as AntApp } from 'antd';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from './services/firebase';
import { setUser, setLoading } from './store/slices/authSlice';
import type { RootState } from './store/store';
import { darkTheme, lightTheme } from './theme/themeConfig';
import Router from './Router';
import './App.css';
import './styles/theme-variables.css';

export default function App() {
  const dispatch = useDispatch();
  const loading = useSelector((state: RootState) => state.auth.loading);
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

  // Set theme data attribute and body background
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = isDarkMode ? '#141414' : '#ffffff';
    document.body.style.color = isDarkMode ? '#ffffff' : '#000000';
  }, [isDarkMode]);

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

    return () => unsubscribe();
  }, [dispatch]);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <AntApp>
        <Router />
      </AntApp>
    </ConfigProvider>
  );
}