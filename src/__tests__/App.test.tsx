jest.mock('../services/firebaseAuth');
jest.mock('../services/firebase', () => ({
  // Provide a minimal async signOut so App's geo flow can call it during tests
  auth: { signOut: async () => {} } as any,
  db: {} as any,
}));
// If App imports onAuthStateChanged from 'firebase/auth'
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth: any, callback: any) => {
    callback(null);
    return jest.fn();
  }),
}));
beforeAll(() => {
  // Make jsdom location look like your production base path
  window.history.pushState({}, 'Test page', '/');
});
import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
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
  test('renders without crashing', async () => {
    // Rely on the stable global fetch mock (returns US by default)
    await act(async () => {
      renderWithProviders(<App />);
      // Wait for the loading screen to be removed so state updates run inside act()
      await waitFor(() => expect(document.querySelector('.loading-screen')).not.toBeInTheDocument());
    });
    expect(document.body).toBeInTheDocument();
  });
});