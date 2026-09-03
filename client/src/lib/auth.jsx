import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, endpoints, token } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token.get()) { setUser(null); setLoading(false); return null; }
    try {
      const me = await api.get(endpoints.me());
      setUser(me);
      return me;
    } catch {
      token.clear();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.post(endpoints.login(), { email, password });
    token.set(res.token);
    const me = await api.get(endpoints.me());
    setUser(me);
    return me;
  }, []);

  const registerStartup = useCallback(async (payload) => {
    const res = await api.post(endpoints.registerStartup(), payload);
    token.set(res.token);
    const me = await api.get(endpoints.me());
    setUser(me);
    return { me, eligibility: res.eligibility };
  }, []);

  const logout = useCallback(() => {
    token.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, registerStartup, refresh, isAuthed: !!user }),
    [user, loading, login, logout, registerStartup, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Convenience predicates used all over the navigation and page guards. */
export function usePerms() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    isStartup: role === 'STARTUP',
    isEvaluator: role === 'EVALUATOR',
    isAdmin: role === 'ADMIN',
    isDeptHead: role === 'DEPT_HEAD',
    isNodal: role === 'NODAL_OFFICER',
    isMonitor: role === 'PILOT_MONITOR',
    isProcurement: role === 'PROCUREMENT_OFFICER',
    isOfficial: !!role && role !== 'STARTUP',
    canAuthorChallenge: ['NODAL_OFFICER', 'DEPT_HEAD', 'ADMIN'].includes(role),
    canApprove: ['DEPT_HEAD', 'ADMIN'].includes(role),
    canProcure: ['PROCUREMENT_OFFICER', 'DEPT_HEAD', 'ADMIN'].includes(role),
    canReviewMilestone: ['PILOT_MONITOR', 'NODAL_OFFICER', 'DEPT_HEAD', 'ADMIN'].includes(role),
  };
}
