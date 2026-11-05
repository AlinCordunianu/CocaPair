import { useEffect, useRef } from 'react';
import { DetectionOverlay } from '../DetectionOverlay/DetectionOverlay';
import './Camera.scss';
import X from 'lucide-react/icons/x';
import Heart from 'lucide-react/icons/heart';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Cylinder from 'lucide-react/icons/cylinder';

export function Camera({
  stream,
  detections,
  hugConfirmed,
  onVideo,
  onError,
  onClose,
  onRescan,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;
    video.srcObject = stream;
    onVideo(video);
    void video.play().catch((error) => {
      if (!cancelled) onError(error);
    });
    return () => {
      cancelled = true;
      video.pause();
      video.srcObject = null;
      onVideo(null);
    };
  }, [stream, onVideo, onError]);

  return (
    <section className="camera" aria-label="Live detection">
      <header className="camera__header">
        <button
          className="icon-button camera__close"
          onClick={onClose}
          aria-label="Close camera"
        >
          <X className="icon" aria-hidden="true" />
        </button>
        <h1>Live detection</h1>
        <span className="camera__live">
          <span /> Live
        </span>
      </header>
      <div className="camera__preview">
        <video
          ref={ref}
          muted
          playsInline
          autoPlay
          aria-label="Rear camera preview"
        />
        <div
          className={`camera__guide ${hugConfirmed ? 'camera__guide--confirmed' : ''}`}
        />
        <DetectionOverlay video={ref.current} detections={detections} />
        <p
          className={`camera__feedback ${hugConfirmed ? 'camera__feedback--success' : ''}`}
          role="status"
        >
          <Heart className="icon" aria-hidden="true" />{' '}
          {hugConfirmed ? 'Hug detected!' : 'Bring two cans together'}
        </p>
      </div>
      <footer className="camera__footer">
        <p>
          Original or Zero.
          <br />
          <strong>Every pair belongs together.</strong>
        </p>
        <button
          className="camera__shutter"
          onClick={onRescan}
          aria-label="Restart scan"
        >
          <RotateCcw className="icon" aria-hidden="true" />
        </button>
        <span
          className="camera__count"
          aria-label={`${detections.length} cans detected`}
        >
          <Cylinder className="icon" aria-hidden="true" /> {detections.length}
        </span>
      </footer>
    </section>
  );
}
