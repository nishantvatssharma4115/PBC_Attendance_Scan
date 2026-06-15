import { useState, useEffect, useRef, useCallback } from "react";
import { dayDate } from "../data/delegates";

const SHEETS_URL = "";
const STORE_KEY = "pbc2026_sessions_v2";
const ACTIVE_KEY = "pbc2026_active_session_v2";
const DEVICE_ID_KEY = "pbc2026_device_id";

const SHEETS_ENABLED = Boolean(SHEETS_URL);

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `DEV_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `DEV_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
}

async function sheetsGet(action, params = {}) {
  const url = new URL(SHEETS_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function sheetsPost(action, body) {
  const url = new URL(SHEETS_URL);
  url.searchParams.set("action", action);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function sheetSessionToLocal(rs) {
  return {
    id: rs.sessionId,
    day: rs.day,
    sessionNum: rs.sessionNum,
    title: rs.title,
    speaker: rs.speaker,
    cutoff: rs.cutoff,
    date: rs.date,
    createdAt: rs.createdAt,
    scans: {},
  };
}

function mergeRemoteScansIntoSession(session, remoteScans) {
  if (!Array.isArray(remoteScans) || remoteScans.length === 0) return session;

  const newScans = { ...session.scans };
  let changed = false;

  for (const scan of remoteScans) {
    const delegateId = scan.delegateId;
    if (!delegateId || newScans[delegateId]) continue;
    newScans[delegateId] = {
      name: scan.delegateName,
      ts: scan.timestamp,
      status: scan.status,
    };
    changed = true;
  }

  return changed ? { ...session, scans: newScans } : session;
}

export function useSessions() {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem(ACTIVE_KEY) || null;
  });

  const [deviceId] = useState(() => getOrCreateDeviceId());
  const [syncStatus, setSyncStatus] = useState(() => (SHEETS_ENABLED ? "synced" : "disabled"));
  const [pendingScans, setPendingScans] = useState([]);
  const pendingScansRef = useRef([]);

  useEffect(() => {
    pendingScansRef.current = pendingScans;
  }, [pendingScans]);

  const applySyncOutcome = useCallback((networkError) => {
    if (!SHEETS_ENABLED) return;
    if (pendingScansRef.current.length > 0) setSyncStatus("pending");
    else if (networkError) setSyncStatus("offline");
    else setSyncStatus("synced");
  }, []);

  // Keep localStorage synced
  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(ACTIVE_KEY, activeSessionId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeSessionId]);

  // Startup sync: pull sessions + active-session scans from Sheets
  useEffect(() => {
    if (!SHEETS_ENABLED) return;

    (async () => {
      try {
        const remoteSessions = await sheetsGet("getSessions");
        if (!Array.isArray(remoteSessions)) throw new Error("Invalid sessions response");

        setSessions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const merged = [...prev];
          for (const rs of remoteSessions) {
            if (rs.sessionId && !existingIds.has(rs.sessionId)) {
              merged.push(sheetSessionToLocal(rs));
            }
          }
          return merged;
        });

        const activeId = localStorage.getItem(ACTIVE_KEY);
        if (activeId) {
          const remoteScans = await sheetsGet("getScans", { sessionId: activeId });
          if (!Array.isArray(remoteScans)) throw new Error("Invalid scans response");

          setSessions((prev) =>
            prev.map((s) => (s.id === activeId ? mergeRemoteScansIntoSession(s, remoteScans) : s))
          );
        }

        applySyncOutcome(false);
      } catch {
        applySyncOutcome(true);
      }
    })();
  }, [applySyncOutcome]);

  // Poll Sheets every 10s for scans from other devices
  useEffect(() => {
    if (!SHEETS_ENABLED || !activeSessionId) return;

    const poll = async () => {
      try {
        const remoteScans = await sheetsGet("getScans", { sessionId: activeSessionId });
        if (!Array.isArray(remoteScans)) throw new Error("Invalid scans response");

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId ? mergeRemoteScansIntoSession(s, remoteScans) : s
          )
        );
        applySyncOutcome(false);
      } catch {
        applySyncOutcome(true);
      }
    };

    const intervalId = setInterval(poll, 10000);
    return () => clearInterval(intervalId);
  }, [activeSessionId, applySyncOutcome]);

  // Retry pending scan queue every 30s
  useEffect(() => {
    if (!SHEETS_ENABLED) return;

    const flushPending = async () => {
      const queue = pendingScansRef.current;
      if (queue.length === 0) return;

      const remaining = [];
      let hadNetworkError = false;

      for (const scan of queue) {
        try {
          const result = await sheetsPost("addScan", scan);
          if (result.error && !result.duplicate && !result.success) {
            remaining.push(scan);
          }
        } catch {
          remaining.push(scan);
          hadNetworkError = true;
        }
      }

      setPendingScans(remaining);
      pendingScansRef.current = remaining;

      if (remaining.length > 0) setSyncStatus("pending");
      else applySyncOutcome(hadNetworkError);
    };

    const intervalId = setInterval(flushPending, 30000);
    return () => clearInterval(intervalId);
  }, [applySyncOutcome]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const createSession = (day, sessionNum, title, speaker, cutoff, dateStr) => {
    const existing = sessions.find((s) => s.day === day && s.sessionNum === sessionNum);
    if (existing && !window.confirm(`Day ${day} Session ${sessionNum} already exists (${existing.title}). Replace it?`)) {
      return false;
    }

    const newSession = {
      id: `d${String(day).padStart(2, "0")}s${sessionNum}_${Date.now()}`,
      day,
      sessionNum,
      title,
      speaker,
      cutoff,
      date: dateStr,
      createdAt: new Date().toISOString(),
      scans: existing ? existing.scans : {},
    };

    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== existing?.id);
      return [newSession, ...filtered];
    });
    setActiveSessionId(newSession.id);

    if (SHEETS_ENABLED) {
      sheetsPost("createSession", {
        sessionId: newSession.id,
        day,
        sessionNum,
        title,
        speaker,
        cutoff,
        date: dateStr,
        createdAt: newSession.createdAt,
      }).catch(() => {});
    }

    return true;
  };

  const deleteSession = (id) => {
    if (!window.confirm("Delete this session and all its scans? Cannot be undone.")) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
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
        [id]: { name, ts, status },
      },
    };

    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));

    if (SHEETS_ENABLED) {
      const payload = {
        sessionId: activeSession.id,
        delegateId: id,
        delegateName: name,
        status,
        timestamp: ts,
        deviceId,
      };

      sheetsPost("addScan", payload)
        .then(() => applySyncOutcome(false))
        .catch(() => {
          setPendingScans((prev) => {
            const next = [...prev, payload];
            pendingScansRef.current = next;
            return next;
          });
          setSyncStatus("pending");
        });
    }

    return { duplicate: false, name, status, ts };
  };

  const migrateLocalDataToSheets = useCallback(async () => {
    if (!SHEETS_ENABLED) return { error: "Sheets URL not configured" };

    try {
      for (const session of sessions) {
        await sheetsPost("createSession", {
          sessionId: session.id,
          day: session.day,
          sessionNum: session.sessionNum,
          title: session.title,
          speaker: session.speaker,
          cutoff: session.cutoff,
          date: session.date,
          createdAt: session.createdAt,
        });

        for (const [delegateId, scan] of Object.entries(session.scans || {})) {
          await sheetsPost("addScan", {
            sessionId: session.id,
            delegateId,
            delegateName: scan.name,
            status: scan.status,
            timestamp: scan.ts,
            deviceId,
          });
        }
      }

      applySyncOutcome(false);
      return { success: true };
    } catch (err) {
      applySyncOutcome(true);
      return { error: err.message || "Migration failed" };
    }
  }, [sessions, deviceId, applySyncOutcome]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    deviceId,
    syncStatus,
    pendingScans,
    createSession,
    deleteSession,
    resumeSession,
    recordScan,
    migrateLocalDataToSheets,
  };
}
