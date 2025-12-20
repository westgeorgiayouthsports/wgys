// src/services/__mocks__/firebaseAuth.ts
export const auth = {} as any;
export const db = {} as any;

export const onAuthStateChanged = jest.fn((_auth, callback) => {
  // Immediately call the callback with null (no logged-in user)
  callback(null);
  // Return an unsubscribe function
  return jest.fn();
});
