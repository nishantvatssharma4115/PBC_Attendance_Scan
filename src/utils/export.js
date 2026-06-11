import * as XLSX from 'xlsx';
import { DELEGATES, TOTAL_DELEGATES } from '../data/delegates';

export function downloadXLSX(wb, filename) {
  XLSX.writeFile(wb, filename);
}

export function buildSessionSheet(session) {
  const rows = [["PBC 2026 Attendance — Session Report"], []];
  rows.push(["Day", session.day]);
  rows.push(["Date", session.date]);
  rows.push(["Session #", session.sessionNum]);
  rows.push(["Title", session.title]);
  rows.push(["Speaker", session.speaker || ""]);
  rows.push(["Cutoff Time", session.cutoff]);
  rows.push(["Exported", new Date().toLocaleString("en-IN")]);
  rows.push([]);
  rows.push(["Delegate ID", "Name", "Status", "Scan Time", "Notes"]);

  let present = 0, absent = 0, notScanned = 0;

  DELEGATES.forEach(([id, name]) => {
    const scan = session.scans[id];
    if (scan) {
      const status = scan.status === "present" ? "Present" : "Absent (scanned after cutoff)";
      if (scan.status === "present") present++; else absent++;
      rows.push([id, name, status, new Date(scan.ts).toLocaleString("en-IN"), ""]);
    } else {
      notScanned++;
      rows.push([id, name, "Absent (not scanned)", "", ""]);
    }
  });

  rows.push([]);
  rows.push(["Summary", "", "", "", ""]);
  rows.push(["Present", present]);
  rows.push(["Absent (late scan)", absent]);
  rows.push(["Absent (not scanned)", notScanned]);
  rows.push(["Total Delegates", TOTAL_DELEGATES]);

  return rows;
}
