import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

// Smart camera scanner: fires onScan once per unique QR, then waits COOLDOWN_MS
// before recognising the same QR again. Different QRs fire immediately.
const COOLDOWN_MS = 600;   // same as the standalone HTML version
const SCAN_INTERVAL_MS = 120; // how often we sample the camera frame

export default function CameraScanner({ active, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    let rafHandle = null;
    let isScanning = true;
    let lastRaw = '';
    let lastScanAt = 0;
    let lastFrameAt = 0;

    const startCamera = async () => {
      try {
        const attempts = [
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          { video: { facingMode: 'environment' }, audio: false },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: true, audio: false }
        ];

        let lastErr = null;
        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (e) { lastErr = e; }
        }

        if (!stream) throw lastErr || new Error('Camera not accessible');

        if (videoRef.current && isScanning) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();
          setIsLive(true);
          setError(null);
          rafHandle = requestAnimationFrame(tick);
        }
      } catch (err) {
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Camera permission denied. Use 📸 Photo Scan instead.');
        } else if (name === 'NotFoundError') {
          setError('No camera found. Use 📸 Photo Scan instead.');
        } else {
          setError('Camera unavailable. Use 📸 Photo Scan instead.');
        }
        setIsLive(false);
      }
    };

    const stopCamera = () => {
      isScanning = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (rafHandle) cancelAnimationFrame(rafHandle);
      setIsLive(false);
    };

    const tick = () => {
      if (!isScanning) return;

      // Throttle: only process a frame every SCAN_INTERVAL_MS (120ms)
      if (Date.now() - lastFrameAt < SCAN_INTERVAL_MS) {
        rafHandle = requestAnimationFrame(tick);
        return;
      }
      lastFrameAt = Date.now();

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (vw > 0 && vh > 0) {
          // Scale down for speed — 480px max on longest edge
          const scale = Math.min(1, 480 / Math.max(vw, vh));
          const cw = Math.max(1, Math.floor(vw * scale));
          const ch = Math.max(1, Math.floor(vh * scale));
          canvas.width = cw;
          canvas.height = ch;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, cw, ch);
          const imageData = ctx.getImageData(0, 0, cw, ch);

          // Try normal + inverted — catches dark-on-light and light-on-dark QRs
          const code = jsQR(imageData.data, cw, ch, { inversionAttempts: 'attemptBoth' });

          if (code && code.data) {
            const raw = code.data;
            const now = Date.now();
            const isDuplicate = (raw === lastRaw) && (now - lastScanAt < COOLDOWN_MS);

            if (!isDuplicate) {
              lastRaw = raw;
              lastScanAt = now;
              onScan(raw); // fire exactly once per unique QR
            }
          }
        }
      }

      rafHandle = requestAnimationFrame(tick);
    };

    if (active) {
      setError(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [active, onScan]);

  return (
    <div className="camera-wrap">
      <video
        ref={videoRef}
        id="video"
        muted
        playsInline
        style={{ display: isLive ? 'block' : 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {isLive && <div className="camera-live" style={{ display: 'block' }}>● LIVE</div>}
      <div className="camera-overlay">
        {isLive && <div className="scan-frame" style={{ display: 'block' }} />}
      </div>
      {!isLive && (
        <div className="camera-placeholder">
          {error || 'Starting camera…'}
        </div>
      )}
    </div>
  );
}
