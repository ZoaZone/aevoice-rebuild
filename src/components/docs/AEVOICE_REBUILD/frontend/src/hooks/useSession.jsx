import { useState, useEffect, useCallback } from 'react';
import base44 from '@/api/base44Client';

export function useSession() {
  const [user, setUser]     = useState(null);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing session on mount
  useEffect(() => {
    async function loadSession() {
      if (!base44.isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await base44.me();
        setUser(me);
        if (me?.client_id) {
          const clientData = await base44.getClient(me.client_id);
          setClient(clientData);
        }
      } catch {
        // Token expired or invalid — clear it
        base44.setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = useCallback(async (externalToken) => {
    setIsLoading(true);
    try {
      const { user: me } = await base44.createSession(externalToken);
      setUser(me);
      if (me?.client_id) {
        const clientData = await base44.getClient(me.client_id);
        setClient(clientData);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await base44.logout();
    setUser(null);
    setClient(null);
  }, []);

  return {
    user,
    client,
    token: base44.getToken(),
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };
}