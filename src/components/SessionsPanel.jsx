import { TOTAL_DELEGATES } from '../data/delegates';
import * as XLSX from 'xlsx';
import { buildSessionSheet, downloadXLSX } from '../utils/export';

export default function SessionsPanel({ sessions, deleteSession, resumeSession }) {
  const exportSession = (e, session) => {
    e.stopPropagation();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(buildSessionSheet(session));
    XLSX.utils.book_append_sheet(wb, ws, `D${session.day}S${session.sessionNum}`);
    downloadXLSX(wb, `PBC2026_D${session.day}_S${session.sessionNum}_${session.title.replace(/[^a-z0-9]/gi, "_")}.xlsx`);
  };

  const exportAll = () => {
    if (!sessions.length) { alert("No sessions to export."); return; }
    const wb = XLSX.utils.book_new();
    [...sessions]
      .sort((a, b) => a.day !== b.day ? a.day - b.day : a.sessionNum - b.sessionNum)
      .forEach(s => {
        const ws = XLSX.utils.aoa_to_sheet(buildSessionSheet(s));
        const sheetName = `D${s.day}S${s.sessionNum}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    downloadXLSX(wb, "PBC2026_All_Sessions_Attendance.xlsx");
  };

  return (
    <div className="panel">
      <div className="card">
        <div className="card-title">All Sessions</div>
        <div id="allSessionsList">
          {sessions.length === 0 ? (
            <div className="empty">No sessions recorded yet</div>
          ) : (
            sessions.map(s => {
              const count = Object.keys(s.scans).length;
              const present = Object.values(s.scans).filter(x => x.status === "present").length;
              
              return (
                <div key={s.id} className="session-item" onClick={() => {
                  resumeSession(s.id);
                  window.dispatchEvent(new CustomEvent('switchTab', { detail: 'scan' }));
                }}>
                  <h4><span className="session-badge">D{s.day} S{s.sessionNum}</span>{s.title}</h4>
                  <p>{s.date} · {s.speaker || "—"} · Cutoff {s.cutoff} · {present} present / {count} scanned</p>
                  <div style={{ marginTop: '8px' }}>
                    <button className="btn btn-sm btn-secondary" onClick={(e) => exportSession(e, s)}>⬇ Excel</button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <button className="btn btn-secondary" onClick={exportAll}>⬇ Export All Sessions (Excel)</button>
    </div>
  );
}
