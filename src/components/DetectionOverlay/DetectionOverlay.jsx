import { useEffect, useRef } from 'react';
import { drawDetections } from './drawDetections';
import './DetectionOverlay.scss';

export function DetectionOverlay({ video, detections }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.scale(dpr, dpr);
      drawDetections(
        context,
        detections,
        video.videoWidth,
        video.videoHeight,
        width,
        height,
      );
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    video.addEventListener('resize', draw);
    return () => {
      observer.disconnect();
      video.removeEventListener('resize', draw);
    };
  }, [video, detections]);

  return (
    <canvas ref={canvasRef} className="detection-overlay" aria-hidden="true" />
  );
}
