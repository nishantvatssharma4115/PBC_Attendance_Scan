import { useState } from 'react';
import { TOTAL_DAYS, dayDate, fmtDate, TOTAL_DELEGATES } from '../data/delegates';

export default function SetupPanel({ sessions, createSession, resumeSession }) {
  const [day, setDay] = useState(() => {
    const todayDiff = Math.floor((new Date() - new Date("2026-06-13")) / 86400000) + 1;
    return (todayDiff >= 1 && todayDiff <= TOTAL_DAYS) ? todayDiff : 1;
  });
  const [sessionNum, setSessionNum] = useState(1);
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [cutoff, setCutoff] = useState('09:30');

  const handleCreate = () => {
    if (!title.trim()) { alert("Please enter a session title."); return; }
    if (!cutoff) { alert("Please set a cutoff time."); return; }
    
    const dateStr = fmtDate(dayDate(day));
    const success = createSession(day, sessionNum, title.trim(), speaker.trim(), cutoff, dateStr);
    if (success) {
      setTitle('');
      setSpeaker('');
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'scan' }));
    }
  };

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="panel">
      <div className="card">
        <div className="card-title">New Session</div>
        <div className="row2">
          <div>
            <label>Day</label>
            <select value={day} onChange={e => setDay(Number(e.target.value))}>
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d} ({fmtDate(dayDate(d))})</option>
              ))}
            </select>
          </div>
          <div>
            <label>Session #</label>
            <select value={sessionNum} onChange={e => setSessionNum(Number(e.target.value))}>
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>Session {n}</option>
              ))}
            </select>
          </div>
        </div>
        <label>Session Title</label>
        <input type="text" placeholder="e.g. Opening Keynote" value={title} onChange={e => setTitle(e.target.value)} />
        
        <label>Speaker / Facilitator</label>
        <input type="text" placeholder="e.g. Dr. Rajesh Kumar" value={speaker} onChange={e => setSpeaker(e.target.value)} />
        
        <label>Cutoff Time (scan before = Present, after = Absent)</label>
        <input type="time" value={cutoff} onChange={e => setCutoff(e.target.value)} />
        
        <button className="btn btn-primary" onClick={handleCreate}>Create & Start Scanning</button>
      </div>

      <div className="card">
        <div className="card-title">Quick Resume</div>
        <div id="recentSessions">
          {recentSessions.length === 0 ? (
            <div className="empty">No sessions yet</div>
          ) : (
            recentSessions.map(s => {
              const count = Object.keys(s.scans).length;
              return (
                <div key={s.id} className="session-item" onClick={() => {
                  resumeSession(s.id);
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'scan' }));
                }}>
                  <h4>{s.title}</h4>
                  <p>Day {s.day} · S{s.sessionNum} · {count}/{TOTAL_DELEGATES} scanned · Cutoff {s.cutoff}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
