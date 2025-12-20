import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import store from './store/store';
import { initAnalytics } from './services/analytics';
import './styles/globals.css';
import './styles/theme-variables.css';

initAnalytics(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
