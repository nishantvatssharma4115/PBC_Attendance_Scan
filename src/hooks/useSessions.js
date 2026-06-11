import { useState, useEffect } from "react";
import { dayDate } from "../data/delegates";

const STORE_KEY = "pbc2026_sessions_v2";
const ACTIVE_KEY = "pbc2026_active_session_v2";

export function useSessions() {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  });
  
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem(ACTIVE_KEY) || null;
  });

  // Keep localStorage synced
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(ACTIVE_KEY, activeSessionId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createSession = (day, sessionNum, title, speaker, cutoff, dateStr) => {
    const existing = sessions.find(s => s.day === day && s.sessionNum === sessionNum);
    if (existing && !window.confirm(`Day ${day} Session ${sessionNum} already exists (${existing.title}). Replace it?`)) {
      return false;
    }

    const newSession = {
      id: `d${String(day).padStart(2, "0")}s${sessionNum}_${Date.now()}`,
      day, sessionNum, title, speaker, cutoff,
      date: dateStr,
      createdAt: new Date().toISOString(),
      scans: existing ? existing.scans : {}
    };

    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== existing?.id);
      return [newSession, ...filtered];
    });
    setActiveSessionId(newSession.id);
    return true;
  };

  const deleteSession = (id) => {
    if (!window.confirm("Delete this session and all its scans? Cannot be undone.")) return;
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const resumeSession = (id) => {
    setActiveSessionId(id);
  };

  const cutoffTimestamp = (session) => {
    const [hh, mm] = session.cutoff.split(":");
    const d = dayDate(session.day);
    d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
    return d.getTime();
  };

  const scanStatus = (session, scanTs) => {
    return scanTs <= cutoffTimestamp(session) ? "present" : "absent";
  };

  const recordScan = (id, name) => {
    if (!activeSession) return null;
    if (activeSession.scans[id]) {
      return { duplicate: true, name: activeSession.scans[id].name };
    }
    const ts = new Date().toISOString();
    const status = scanStatus(activeSession, Date.now());
    
    const updatedSession = {
      ...activeSession,
      scans: {
        ...activeSession.scans,
        [id]: { name, ts, status }
      }
    };

    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    return { duplicate: false, name, status, ts };
  };

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    resumeSession,
    recordScan
  };
}
