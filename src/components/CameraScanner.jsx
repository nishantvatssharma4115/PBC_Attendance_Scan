import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function CameraScanner({ active, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    let rafHandle = null;
    let isScanning = true;
    
    const startCamera = async () => {
      try {
        const attempts = [
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          { video: { facingMode: "environment" }, audio: false },
          { video: true, audio: false }
        ];
        
        let lastErr = null;
        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (e) { lastErr = e; }
        }
        
        if (!stream) throw lastErr || new Error("Camera not accessible");
        
        if (videoRef.current && isScanning) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          setIsLive(true);
          tick();
        }
      } catch (err) {
        setError("Camera blocked or not available. Use Photo Scan.");
      }
    };

    const stopCamera = () => {
      isScanning = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsLive(false);
      if (rafHandle) cancelAnimationFrame(rafHandle);
    };

    const tick = () => {
      if (!isScanning) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        if (vw > 0 && vh > 0) {
          // Scale down for faster processing
          const scale = Math.min(1, 480 / Math.max(vw, vh));
          const cw = Math.floor(vw * scale);
          const ch = Math.floor(vh * scale);
          
          canvas.width = cw;
          canvas.height = ch;
          ctx.drawImage(video, 0, 0, cw, ch);
          
          const imageData = ctx.getImageData(0, 0, cw, ch);
          const code = jsQR(imageData.data, cw, ch, { inversionAttempts: "attemptBoth" });
          
          if (code) {
            onScan(code.data);
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
    <div className="camera-wrap" style={{ display: active ? 'block' : 'none' }}>
      <video ref={videoRef} id="video" muted playsInline style={{ display: isLive ? 'block' : 'none' }}></video>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      {isLive && <div className="camera-live" style={{display: 'block'}}>● LIVE</div>}
      <div className="camera-overlay">
        {isLive && <div className="scan-frame" style={{display: 'block'}}></div>}
      </div>
      {!isLive && <div className="camera-placeholder">{error || "Starting camera..."}</div>}
    </div>
  );
}
