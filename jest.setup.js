jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-id')),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 11)),
}));

jest.mock('react-native-url-polyfill/auto', () => {});

jest.mock('./src/lib/supabase', () => {
  const mockChain = () => {
    const chain = {
      select: jest.fn(() => chain),
      insert: jest.fn(() => chain),
      update: jest.fn(() => chain),
      delete: jest.fn(() => chain),
      upsert: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      in: jest.fn(() => chain),
      order: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((resolve) => resolve({ data: null, error: null })),
    };
    return chain;
  };

  return {
    supabase: {
      from: jest.fn(() => mockChain()),
      rpc: jest.fn(() => Promise.resolve({ data: 'OK', error: null })),
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
        signUp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signOut: jest.fn(() => Promise.resolve()),
        setSession: jest.fn(() => Promise.resolve()),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
    },
  };
});

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: 'Link',
  Stack: {
    Screen: 'Screen',
  },
  Redirect: 'Redirect',
}));

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 11),
  };
}
