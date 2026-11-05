import { CLASS_LABELS } from '../../constants/detection';
import { previewBox } from '../../services/detectionMath';

export function drawDetections(
  context,
  detections,
  videoWidth,
  videoHeight,
  width,
  height,
) {
  // Clear every completed result, including an empty one, so boxes cannot linger.
  context.clearRect(0, 0, width, height);
  if (!videoWidth || !videoHeight) return;
  context.font = '600 11px Inter, sans-serif';
  context.lineWidth = 2;
  for (const detection of detections) {
    const box = previewBox(
      detection.bbox,
      videoWidth,
      videoHeight,
      width,
      height,
    );
    context.strokeStyle = '#dbf2e0';
    context.strokeRect(box.x, box.y, box.width, box.height);
    const label = `${CLASS_LABELS[detection.classId]} ${Math.round(detection.confidence * 100)}%`;
    const labelWidth = context.measureText(label).width + 16;
    const x = Math.max(0, Math.min(width - labelWidth, box.x));
    const y = Math.max(24, Math.min(height, box.y));
    context.fillStyle = detection.classId === 0 ? '#e8121f' : '#0f0d0d';
    context.fillRect(x, y - 24, labelWidth, 24);
    context.fillStyle = '#ffffff';
    context.fillText(label, x + 8, y - 8);
  }
}
