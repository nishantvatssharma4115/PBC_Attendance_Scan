import { useState, useRef, useCallback } from 'react';
import CameraScanner from './CameraScanner';
import { TOTAL_DELEGATES, parseQR, fmtTime } from '../data/delegates';
import jsQR from 'jsqr';
import * as XLSX from 'xlsx';
import { buildSessionSheet, downloadXLSX } from '../utils/export';

export default function ScanPanel({ activeSession, recordScan, setToast }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [flash, setFlash] = useState({ type: 'idle', msg: 'Waiting for session...' });
  const fileInputRef = useRef(null);
  const lastScanRef = useRef({ raw: '', time: 0 });

  const beep = (freq) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted, ignore silently
    }
  };

  const handleScan = useCallback((raw) => {
    if (!activeSession) return;
    
    const now = Date.now();
    if (raw === lastScanRef.current.raw && now - lastScanRef.current.time < 1000) return;
    lastScanRef.current = { raw, time: now };

    const parsed = parseQR(raw);
    if (!parsed.ok) {
      setFlash({ type: 'error', msg: `⚠ ${parsed.reason}` });
      setToast({ type: 'error', icon: '❌', title: 'Unknown QR', sub: parsed.reason });
      beep(200);
      return;
    }

    const result = recordScan(parsed.id, parsed.name);
    
    if (!result) return;

    if (result.duplicate) {
      setFlash({ type: 'dup', msg: `Already scanned: ${result.name}` });
      setToast({ type: 'dup', icon: '⚠️', title: 'Already Scanned', sub: result.name });
      beep(350);
      if (navigator.vibrate) navigator.vibrate(30);
      return;
    }

    const isPresent = result.status === 'present';
    setFlash({
      type: isPresent ? 'ok' : 'dup',
      msg: `✓ ${result.name} — ${isPresent ? 'Present' : 'Absent (late)'} @ ${fmtTime(result.ts)}`
    });
    setToast({
      type: isPresent ? 'ok' : 'dup',
      icon: isPresent ? '✅' : '⚠️',
      title: `${result.name} — ${isPresent ? 'Marked Present ✅' : 'Marked Absent (late) ⚠️'}`,
      sub: `Scanned at ${fmtTime(result.ts)}`
    });
    beep(isPresent ? 880 : 440);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [activeSession, recordScan, setToast]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeSession) return;

    setFlash({ type: 'idle', msg: 'Reading QR from photo...' });

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
      
      URL.revokeObjectURL(url);
      
      if (code) {
        handleScan(code.data);
      } else {
        setFlash({ type: 'error', msg: 'No QR found — try again' });
        setToast({ type: 'error', icon: '❌', title: 'No QR Found', sub: 'Move closer or improve lighting' });
        beep(200);
      }
    };
    img.src = url;
    e.target.value = '';
  };

  const exportActiveSession = () => {
    if (!activeSession) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(buildSessionSheet(activeSession));
    XLSX.utils.book_append_sheet(wb, ws, `D${activeSession.day}S${activeSession.sessionNum}`);
    downloadXLSX(wb, `PBC2026_D${activeSession.day}_S${activeSession.sessionNum}_${activeSession.title.replace(/[^a-z0-9]/gi, "_")}.xlsx`);
  };

  if (!activeSession) {
    return (
      <div className="panel">
        <div className="session-banner inactive">
          <h3>No active session</h3>
          <p>Go to Setup tab to create a session first</p>
        </div>
        <div className="stats-row">
          <div className="stat"><div className="stat-val c-green">0</div><div className="stat-lbl">Present</div></div>
          <div className="stat"><div className="stat-val c-red">{TOTAL_DELEGATES}</div><div className="stat-lbl">Absent</div></div>
          <div className="stat"><div className="stat-val">0</div><div className="stat-lbl">Scanned</div></div>
          <div className="stat"><div className="stat-val">{TOTAL_DELEGATES}</div><div className="stat-lbl">Total</div></div>
        </div>
        <div className="card" style={{marginTop: '12px'}}>
          <div className="card-title">Recent Scans</div>
          <div className="scan-list"><div className="empty">No session active</div></div>
        </div>
      </div>
    );
  }

  const scans = Object.values(activeSession.scans);
  const presentCount = scans.filter(s => s.status === "present").length;
  const scannedCount = scans.length;
  const absentCount = TOTAL_DELEGATES - presentCount;

  const sortedScans = Object.entries(activeSession.scans)
    .sort((a, b) => new Date(b[1].ts) - new Date(a[1].ts));

  return (
    <div className="panel">
      <div className="session-banner">
        <h3>{activeSession.title}</h3>
        <p>Day {activeSession.day} · Session {activeSession.sessionNum} · {activeSession.speaker || "—"} · Cutoff {activeSession.cutoff}</p>
      </div>

      <div className="stats-row">
        <div className="stat"><div className="stat-val c-green">{presentCount}</div><div className="stat-lbl">Present</div></div>
        <div className="stat"><div className="stat-val c-red">{absentCount}</div><div className="stat-lbl">Absent</div></div>
        <div className="stat"><div className="stat-val">{scannedCount}</div><div className="stat-lbl">Scanned</div></div>
        <div className="stat"><div className="stat-val">{TOTAL_DELEGATES}</div><div className="stat-lbl">Total</div></div>
      </div>

      {cameraActive ? (
        <CameraScanner active={cameraActive} onScan={handleScan} />
      ) : (
        <div className="camera-wrap" style={{background: 'var(--surface2)'}}>
          <div className="camera-placeholder">Tap "Scan Live QR" to open camera</div>
        </div>
      )}

      <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />

      <div className="scan-btn-row">
        <button 
          className={`btn btn-live ${cameraActive ? 'active' : ''}`}
          onClick={() => setCameraActive(!cameraActive)}
        >
          {cameraActive ? '⏹ Stop Live' : '📹 Scan Live QR'}
        </button>
        <button className="btn btn-photo" onClick={() => fileInputRef.current?.click()}>
          📸 Scan QR Code
        </button>
      </div>

      <button className="btn btn-secondary" onClick={exportActiveSession} style={{marginBottom: '12px'}}>
        ⬇ Export This Session (Excel)
      </button>

      <div className={`flash flash-${flash.type}`}>
        {flash.msg}
      </div>

      <div className="card" style={{marginTop: '12px'}}>
        <div className="card-title">Recent Scans <span>({scannedCount})</span></div>
        <div className="scan-list">
          {sortedScans.length === 0 ? (
            <div className="empty">No scans yet — start scanning!</div>
          ) : (
            sortedScans.map(([id, s]) => (
              <div key={id} className="scan-item">
                <div className={`scan-dot ${s.status}`}></div>
                <div className="scan-info">
                  <div className="scan-name">{s.name}</div>
                  <div className="scan-meta">{id} · {fmtTime(s.ts)} · {s.status === "present" ? "Present" : "Absent (late)"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
