import { useState, useRef, useCallback } from 'react';
import CameraScanner from './CameraScanner';
import { TOTAL_DELEGATES, parseQR, fmtTime } from '../data/delegates';
import jsQR from 'jsqr';
import * as XLSX from 'xlsx';
import { buildSessionSheet, downloadXLSX } from '../utils/export';

// Cooldown matches the standalone HTML version (600ms, was 1000ms before)
const SAME_QR_COOLDOWN = 600;

export default function ScanPanel({ activeSession, recordScan, setToast }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [flash, setFlash] = useState({ type: 'idle', msg: 'Waiting for session…' });
  const fileInputRef = useRef(null);
  const flashTimerRef = useRef(null);

  // CameraScanner now handles deduplication internally, so we only need
  // a tiny guard here for the photo path (in case user taps very fast).
  const lastPhotoScanRef = useRef({ raw: '', time: 0 });

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
    } catch (_) { /* audio blocked — ignore */ }
  };

  const setFlashWithAutoReset = (type, msg, delay = 1500) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash({ type, msg });
    if (type !== 'idle') {
      flashTimerRef.current = setTimeout(() => {
        setFlash({ type: 'idle', msg: activeSession ? 'Ready to scan…' : 'Waiting for session…' });
      }, delay);
    }
  };

  const processRaw = useCallback((raw) => {
    if (!activeSession) return;

    const parsed = parseQR(raw);
    if (!parsed.ok) {
      setFlashWithAutoReset('error', `⚠ ${parsed.reason}`);
      setToast({ type: 'error', icon: '❌', title: 'Unknown QR', sub: parsed.reason });
      beep(200);
      return;
    }

    const result = recordScan(parsed.id, parsed.name);
    if (!result) return;

    if (result.duplicate) {
      setFlashWithAutoReset('dup', `Already scanned: ${result.name}`);
      setToast({ type: 'dup', icon: '⚠️', title: 'Already Scanned', sub: result.name });
      beep(350);
      if (navigator.vibrate) navigator.vibrate(30);
      return;
    }

    const isPresent = result.status === 'present';
    setFlashWithAutoReset(
      isPresent ? 'ok' : 'dup',
      `✓ ${result.name} — ${isPresent ? 'Present' : 'Absent (late)'} @ ${fmtTime(result.ts)}`
    );
    setToast({
      type: isPresent ? 'ok' : 'dup',
      icon: isPresent ? '✅' : '⚠️',
      title: `${result.name} — ${isPresent ? 'Marked Present ✅' : 'Marked Absent (late) ⚠️'}`,
      sub: `Scanned at ${fmtTime(result.ts)}`
    });
    beep(isPresent ? 880 : 440);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [activeSession, recordScan, setToast]);

  // Camera path: CameraScanner handles deduplication, so we just process directly
  const handleCameraScan = useCallback((raw) => {
    processRaw(raw);
  }, [processRaw]);

  // Photo path: slight guard against double-tap
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeSession) return;

    setFlashWithAutoReset('idle', 'Reading QR from photo…', 8000);

    // Try multiple scales for better detection on low-res photos
    const raw = await decodeQRFromFile(file);

    if (!raw) {
      setFlashWithAutoReset('error', 'No QR found — move closer, hold steady, try again');
      setToast({ type: 'error', icon: '❌', title: 'No QR Found', sub: 'Move closer or improve lighting' });
      beep(200);
      e.target.value = '';
      return;
    }

    // Brief photo cooldown just for accidental double-taps
    const now = Date.now();
    if (raw === lastPhotoScanRef.current.raw && now - lastPhotoScanRef.current.time < SAME_QR_COOLDOWN) {
      e.target.value = '';
      return;
    }
    lastPhotoScanRef.current = { raw, time: now };

    processRaw(raw);
    e.target.value = '';
  };

  const exportActiveSession = () => {
    if (!activeSession) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(buildSessionSheet(activeSession));
    XLSX.utils.book_append_sheet(wb, ws, `D${activeSession.day}S${activeSession.sessionNum}`);
    downloadXLSX(wb, `PBC2026_D${activeSession.day}_S${activeSession.sessionNum}_${activeSession.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
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
        <div className="card" style={{ marginTop: '12px' }}>
          <div className="card-title">Recent Scans</div>
          <div className="scan-list"><div className="empty">No session active</div></div>
        </div>
      </div>
    );
  }

  const scans = Object.values(activeSession.scans);
  const presentCount = scans.filter(s => s.status === 'present').length;
  const scannedCount = scans.length;
  const absentCount = TOTAL_DELEGATES - presentCount;
  const sortedScans = Object.entries(activeSession.scans)
    .sort((a, b) => new Date(b[1].ts) - new Date(a[1].ts));

  return (
    <div className="panel">
      <div className="session-banner">
        <h3>{activeSession.title}</h3>
        <p>Day {activeSession.day} · Session {activeSession.sessionNum} · {activeSession.speaker || '—'} · Cutoff {activeSession.cutoff}</p>
      </div>

      <div className="stats-row">
        <div className="stat"><div className="stat-val c-green">{presentCount}</div><div className="stat-lbl">Present</div></div>
        <div className="stat"><div className="stat-val c-red">{absentCount}</div><div className="stat-lbl">Absent</div></div>
        <div className="stat"><div className="stat-val">{scannedCount}</div><div className="stat-lbl">Scanned</div></div>
        <div className="stat"><div className="stat-val">{TOTAL_DELEGATES}</div><div className="stat-lbl">Total</div></div>
      </div>

      {cameraActive ? (
        <CameraScanner active={cameraActive} onScan={handleCameraScan} />
      ) : (
        <div className="camera-wrap" style={{ background: 'var(--surface2)' }}>
          <div className="camera-placeholder">Tap "Scan Live QR" to open camera</div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <div className="scan-btn-row">
        <button
          className={`btn btn-live ${cameraActive ? 'active' : ''}`}
          onClick={() => setCameraActive(v => !v)}
        >
          {cameraActive ? '⏹ Stop Live' : '📹 Scan Live QR'}
        </button>
        <button className="btn btn-photo" onClick={() => fileInputRef.current?.click()}>
          📸 Scan QR Code
        </button>
      </div>

      <button className="btn btn-secondary" onClick={exportActiveSession} style={{ marginBottom: '12px' }}>
        ⬇ Export This Session (Excel)
      </button>

      <div className={`flash flash-${flash.type}`}>{flash.msg}</div>

      <div className="card" style={{ marginTop: '12px' }}>
        <div className="card-title">
          Recent Scans <span style={{ fontWeight: 400 }}>({scannedCount})</span>
        </div>
        <div className="scan-list">
          {sortedScans.length === 0 ? (
            <div className="empty">No scans yet — start scanning!</div>
          ) : (
            sortedScans.map(([id, s]) => (
              <div key={id} className="scan-item">
                <div className={`scan-dot ${s.status}`} />
                <div className="scan-info">
                  <div className="scan-name">{s.name}</div>
                  <div className="scan-meta">
                    {id} · {fmtTime(s.ts)} · {s.status === 'present' ? 'Present' : 'Absent (late)'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Multi-scale QR decoder for photo uploads ───────────────────────────────
// Tries multiple sizes to handle low-res, zoomed-out, or dark photos.
async function decodeQRFromFile(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const result = tryDecodeAtScales(img, canvas, ctx);
      URL.revokeObjectURL(url);
      resolve(result);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function tryDecodeAtScales(img, canvas, ctx) {
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;
  // Try at full size, 75%, 50%, and upscaled 150%
  const scales = [1, 0.75, 0.5, 1.5];
  for (const s of scales) {
    const w = Math.max(1, Math.floor(ow * s));
    const h = Math.max(1, Math.floor(oh * s));
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (code) return code.data;
  }
  return null;
}
