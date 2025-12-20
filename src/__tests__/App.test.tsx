jest.mock('../services/firebaseAuth');
jest.mock('../services/firebase', () => ({
  auth: {} as any,
  db: {} as any,
}));
// If App imports onAuthStateChanged from 'firebase/auth'
jest.mock('firebase/auth', () => {
  const actual = jest.requireActual('firebase/auth');
  return {
    ...actual,
    onAuthStateChanged: jest.fn((_auth, callback) => {
      callback(null);      // or fake user
      return jest.fn();    // unsubscribe
    }),
  };
});
beforeAll(() => {
  // Make jsdom location look like your production base path
  window.history.pushState({}, 'Test page', '/');
});
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import App from '../App';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
        {component}
    </Provider>
  );
};

describe('App Component', () => {
  test('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(document.body).toBeInTheDocument();
  });
});