'use client';

// First real customer auth in this app — a completely separate system
// from the admin panel's httpOnly-cookie session (must never share a
// code path or storage). Ports app.js's initAuth()/mapSupaUser()/
// doLogin()/doRegister()/logoutUser() etc. as one Context instead of
// module-level globals (`FW_USER`, `_sb`) + 7 duplicated
// getSession()-for-bearer-token call sites.
//
// [NOT-PORTED] The old doLogin()/doRegister()'s "demo user" offline
// fallback (used when Supabase itself is unreachable) was dev/offline
// scaffolding, not a real feature — dropped entirely here.
// [NOT-PORTED] syncLocalBookingsToSupabase() (direct browser->Supabase
// table insert on every session restore) is flagged in auth.routes.js's
// own comments as broken (wrong column names, no RLS) — the correct
// replacement, linkGuestBookings() below, is what's wired in instead.
import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { supabase } from '../supabaseClient';
import { linkGuestBookings } from '../booking-api';

function mapSupaUser(supaUser) {
  const meta = supaUser.user_metadata || {};
  return {
    id: supaUser.id,
    email: supaUser.email,
    name: meta.name || meta.full_name || (supaUser.email ? supaUser.email.split('@')[0] : 'Nutzer'),
    accountNumber: meta.account_number || '',
  };
}

const initialState = { status: 'loading', user: null, passwordRecovery: false };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { status: 'ready', user: action.user, passwordRecovery: false };
    case 'SET_UNAUTHENTICATED':
      return { status: 'ready', user: null, passwordRecovery: false };
    case 'PASSWORD_RECOVERY':
      return { ...state, passwordRecovery: true };
    default:
      return state;
  }
}

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const session = data && data.session;
      if (session && session.user) {
        dispatch({ type: 'SET_USER', user: mapSupaUser(session.user) });
        linkGuestBookings();
      } else {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        dispatch({ type: 'PASSWORD_RECOVERY' });
        return;
      }
      if (session && session.user) {
        dispatch({ type: 'SET_USER', user: mapSupaUser(session.user) });
        linkGuestBookings();
      } else {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error, user: data && data.user ? mapSupaUser(data.user) : null };
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    return {
      error,
      session: data && data.session,
      // A truthy identities array of length 0 means Supabase silently
      // treated this as a duplicate account (its anti-enumeration
      // behavior) — same signal app.js's doRegister() checks.
      alreadyRegistered: !!(data && data.user && data.user.identities && data.user.identities.length === 0),
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    return { error };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore — we clear local state regardless */ }
    dispatch({ type: 'SET_UNAUTHENTICATED' });
  }, []);

  const value = {
    status: state.status,
    user: state.user,
    isAuthenticated: !!state.user,
    passwordRecovery: state.passwordRecovery,
    signIn, signUp, signInWithGoogle, resetPassword, updatePassword, signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AuthProvider, useAuth };
