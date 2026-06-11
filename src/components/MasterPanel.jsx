import { DELEGATES } from '../data/delegates';
import * as XLSX from 'xlsx';
import { downloadXLSX } from '../utils/export';

export default function MasterPanel({ sessions }) {
  const sortedSessions = [...sessions].sort((a, b) => 
    a.day !== b.day ? a.day - b.day : a.sessionNum - b.sessionNum
  );

  const getAttendanceMatrix = () => {
    const matrix = DELEGATES.map(([id, name]) => {
      const row = { id, name, cells: {}, present: 0, absent: 0, scanned: 0 };
      sortedSessions.forEach(s => {
        const key = `D${s.day}S${s.sessionNum}`;
        const scan = s.scans[id];
        if (scan) {
          row.cells[key] = scan.status === "present" ? "P" : "A";
          row.scanned++;
          if (scan.status === "present") row.present++;
          else row.absent++;
        } else {
          row.cells[key] = "A";
          row.absent++;
        }
      });
      return row;
    });
    return matrix;
  };

  const exportMaster = () => {
    if (!sortedSessions.length) { alert("No sessions recorded yet."); return; }
    const matrix = getAttendanceMatrix();
    const cols = sortedSessions.map(s => `D${s.day}S${s.sessionNum}`);
    const header = ["Delegate ID", "Name", ...cols, "Present Count", "Sessions Held"];
    const rows = [header];

    matrix.forEach(row => {
      rows.push([
        row.id, row.name,
        ...cols.map(c => row.cells[c] || "—"),
        row.present, sortedSessions.length
      ]);
    });

    rows.push([]);
    rows.push(["Session Summary"]);
    sortedSessions.forEach(s => {
      const key = `D${s.day}S${s.sessionNum}`;
      let p = 0;
      DELEGATES.forEach(([id]) => { if (s.scans[id]?.status === "present") p++; });
      rows.push([key, s.title, s.speaker, s.cutoff, `Present: ${p}/${DELEGATES.length}`]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Master Attendance");
    downloadXLSX(wb, "PBC2026_Master_Attendance.xlsx");
  };

  const matrix = getAttendanceMatrix();

  return (
    <div className="panel">
      <div className="card">
        <div className="card-title">Attendance Matrix</div>
        <p style={{fontSize: '12px', color: 'var(--muted)', marginBottom: '12px'}}>
          P = Present (scanned before cutoff) · A = Absent (not scanned or after cutoff) · — = session not held yet
        </p>
        <div className="master-table-wrap">
          {sortedSessions.length === 0 ? (
            <div className="empty">Record some sessions to see the master sheet</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  {sortedSessions.map(s => (
                    <th key={s.id}>D{s.day}S{s.sessionNum}</th>
                  ))}
                  <th>Present</th>
                  <th>Total Sess.</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td className="name-col">{row.name}</td>
                    {sortedSessions.map(s => {
                      const c = `D${s.day}S${s.sessionNum}`;
                      const v = row.cells[c];
                      if (!v) return <td key={c} className="cell-dash">—</td>;
                      return <td key={c} className={v === "P" ? "cell-p" : "cell-a"}>{v}</td>;
                    })}
                    <td className="cell-p">{row.present}</td>
                    <td>{sortedSessions.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <button className="btn btn-primary" onClick={exportMaster}>⬇ Export Master Sheet (Excel)</button>
    </div>
  );
}
