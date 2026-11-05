import {
  CLASS_NAMES,
  MAX_DETECTIONS,
  MODEL_INPUT_SIZE,
  NMS_IOU_THRESHOLD,
} from '../constants/detection';
import { meetsConfidenceThreshold } from './confidence';

export function letterbox(width, height) {
  const scale = Math.min(MODEL_INPUT_SIZE / width, MODEL_INPUT_SIZE / height);
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(height * scale);
  return {
    width,
    height,
    resizedWidth,
    resizedHeight,
    scaleX: resizedWidth / width,
    scaleY: resizedHeight / height,
    offsetX: Math.floor((MODEL_INPUT_SIZE - resizedWidth) / 2),
    offsetY: Math.floor((MODEL_INPUT_SIZE - resizedHeight) / 2),
  };
}

export function mapBox(cx, cy, width, height, transform) {
  const { offsetX, offsetY, scaleX, scaleY } = transform;

  const clamp = (n) => Math.max(0, Math.min(1, n));

  const x = clamp(
    ((cx - width / 2) * MODEL_INPUT_SIZE - offsetX) / scaleX / transform.width,
  );
  const y = clamp(
    ((cy - height / 2) * MODEL_INPUT_SIZE - offsetY) /
      scaleY /
      transform.height,
  );
  const right = clamp(
    ((cx + width / 2) * MODEL_INPUT_SIZE - offsetX) / scaleX / transform.width,
  );
  const bottom = clamp(
    ((cy + height / 2) * MODEL_INPUT_SIZE - offsetY) /
      scaleY /
      transform.height,
  );
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

export function intersectionOverUnion(a, b) {
  const intersection =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

export function decodeOutput(data, shape, transform) {
  if (shape.join(',') !== '1,6,8400' || data.length !== 50400)
    throw new Error(
      `Unexpected model output: [${shape}]. Expected this model's [1,6,8400] raw head.`,
    );
  const count = shape[2];
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const original = data[4 * count + i];
    const zero = data[5 * count + i];
    const classId = zero > original ? 1 : 0;
    const confidence = classId === 0 ? original : zero;
    if (
      !Number.isFinite(confidence) ||
      !meetsConfidenceThreshold(confidence) ||
      confidence > 1
    )
      continue;
    const cx = data[i],
      cy = data[count + i],
      width = data[2 * count + i],
      height = data[3 * count + i];
    if (
      ![cx, cy, width, height].every(Number.isFinite) ||
      width <= 0 ||
      height <= 0
    )
      continue;
    const bbox = mapBox(cx, cy, width, height, transform);
    if (bbox.width <= 0 || bbox.height <= 0) continue;
    const candidate = {
      classId,
      className: CLASS_NAMES[classId],
      confidence,
      bbox,
    };
    candidates.push(candidate);
  }
  // Raw one-to-many export contains overlapping anchors and has no graph NMS.
  // Suppress across both closely related subtypes to avoid double-labeling one can.
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);

  const kept = [];
  for (let index = 0; index < sorted.length; index++) {
    const candidate = sorted[index];
    if (
      kept.every(
        (other) =>
          intersectionOverUnion(candidate.bbox, other.bbox) < NMS_IOU_THRESHOLD,
      )
    ) {
      kept.push(candidate);
    }
    if (kept.length >= MAX_DETECTIONS) {
      break;
    }
  }
  return kept;
}

/** Map original normalized boxes through the centered object-fit: cover preview. */
export function previewBox(
  box,
  videoWidth,
  videoHeight,
  previewWidth,
  previewHeight,
) {
  const scale = Math.max(
    previewWidth / videoWidth,
    previewHeight / videoHeight,
  );
  const offsetX = (previewWidth - videoWidth * scale) / 2;
  const offsetY = (previewHeight - videoHeight * scale) / 2;
  return {
    x: box.x * videoWidth * scale + offsetX,
    y: box.y * videoHeight * scale + offsetY,
    width: box.width * videoWidth * scale,
    height: box.height * videoHeight * scale,
  };
}
