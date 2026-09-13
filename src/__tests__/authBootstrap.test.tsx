// Regression tests for the AuthProvider startup gate.
//
// The provider must always release `loading`, because every route is hidden
// behind a full-screen spinner until it does and nothing re-runs the effect.

import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const authMock = supabase.auth as unknown as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
};
const fromMock = supabase.from as unknown as jest.Mock;

const SESSION = {
  user: { id: 'user-1', email: 'parent@example.com' },
};

function Probe() {
  const { loading, user } = useAuth();
  return <Text>{loading ? 'loading' : `ready:${user?.role ?? 'anonymous'}`}</Text>;
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

/**
 * supabase-js resolves the access token for every PostgREST request through
 * `getSession()`, which waits on the same `initialize()` promise that emits the
 * first auth state change. This gate reproduces that: queries and `getSession`
 * cannot settle until the auth state change callback has returned.
 */
function createInitializeGate() {
  let settled = false;
  let waiters: Array<() => void> = [];

  return {
    wait: () =>
      settled
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            waiters.push(resolve);
          }),
    release: () => {
      settled = true;
      waiters.forEach((resolve) => resolve());
      waiters = [];
    },
  };
}

function mockProfileQueries(gate: { wait: () => Promise<void> }) {
  fromMock.mockImplementation((table: string) => {
    const rows: Record<string, unknown> = {
      profiles: { id: 'user-1', role: 'admin', display_name: 'Parent', family_id: 'family-1' },
      families: { id: 'family-1', name: 'Test Family' },
    };

    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => {
        await gate.wait();
        return { data: rows[table] ?? null, error: null };
      },
    };

    return chain;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  authMock.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
});

describe('AuthProvider startup gate', () => {
  it('releases loading when there is no stored session', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });

    renderProvider();

    await waitFor(() => expect(screen.getByText('ready:anonymous')).toBeTruthy());
  });

  it('does not deadlock when an auth state change arrives during startup', async () => {
    const gate = createInitializeGate();
    mockProfileQueries(gate);

    authMock.getSession.mockImplementation(async () => {
      await gate.wait();
      return { data: { session: SESSION } };
    });

    // Emit the state change while startup is still pending, and only release
    // the gate once the callback has returned. A callback that awaits a
    // Supabase query here can never complete.
    authMock.onAuthStateChange.mockImplementation((callback: Function) => {
      void (async () => {
        await callback('SIGNED_IN', SESSION);
        gate.release();
      })();

      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    renderProvider();

    await waitFor(() => expect(screen.getByText('ready:admin')).toBeTruthy());
  });

  it('releases loading when the session lookup fails', async () => {
    authMock.getSession.mockRejectedValue(new Error('network unreachable'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider();

    await waitFor(() => expect(screen.getByText('ready:anonymous')).toBeTruthy());
  });
});
