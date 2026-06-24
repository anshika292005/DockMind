import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../ui/Toast';

export function useMemory() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [behaviorProfile, setBehaviorProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/sessions');
      if (res.success) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/memory/profile');
      if (res.success) {
        setBehaviorProfile(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch memory profile', err);
    }
  }, []);

  const createSession = async (sessionName = null, documentFilename = null) => {
    try {
      const res = await api.post('/sessions', { session_name: sessionName, document_filename: documentFilename });
      if (res.success) {
        await fetchSessions();
        setActiveSessionId(res.data.session_id);
        return res.data.session_id;
      }
    } catch (err) {
      addToast({ message: 'Failed to create chat session', type: 'error' });
    }
    return null;
  };

  const deleteSession = async (sessionId) => {
    try {
      const res = await api.delete(`/sessions/${sessionId}`);
      if (res.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
        }
        addToast({ message: 'Session deleted', type: 'success' });
      }
    } catch (err) {
      addToast({ message: 'Failed to delete session', type: 'error' });
    }
  };
  
  const resetMemory = async () => {
    try {
      const res = await api.post('/memory/reset');
      if (res.success) {
        setBehaviorProfile({});
        addToast({ message: 'Memory profile reset', type: 'success' });
      }
    } catch (err) {
      addToast({ message: 'Failed to reset memory', type: 'error' });
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSessions(), fetchProfile()]);
      setLoading(false);
    };
    init();
  }, [fetchSessions, fetchProfile]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    behaviorProfile,
    loading,
    createSession,
    deleteSession,
    fetchProfile,
    fetchSessions,
    resetMemory
  };
}
