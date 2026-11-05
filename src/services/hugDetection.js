import {
  HUG_PROXIMITY_TOLERANCE,
  HUG_REQUIRED_CONFIRMATIONS,
} from '../constants/detection';
import { meetsConfidenceThreshold } from './confidence';

export function validCanDetections(detections) {
  return detections.filter((detection) => {
    if (!detection || (detection.classId !== 0 && detection.classId !== 1))
      return false;
    const { confidence, bbox } = detection;
    return (
      Number.isFinite(confidence) &&
      meetsConfidenceThreshold(confidence) &&
      confidence <= 1 &&
      bbox &&
      [bbox.x, bbox.y, bbox.width, bbox.height].every(Number.isFinite) &&
      bbox.width > 0 &&
      bbox.height > 0
    );
  });
}

// Use original-image normalized boxes, before object-fit/cropping or canvas scaling.
// Measure the shortest distance between rectangle edges, rather than their centers.
export function boxesAreHugging(a, b, tolerance = HUG_PROXIMITY_TOLERANCE) {
  const gapX = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const gapY = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  const allowedGap = (tolerance * (a.width + b.width)) / 2;
  return Math.hypot(gapX, gapY) <= allowedGap + Number.EPSILON;
}

export function hasHugPair(detections, tolerance = HUG_PROXIMITY_TOLERANCE) {
  const cans = validCanDetections(detections);
  for (let i = 0; i < cans.length; i++) {
    for (let j = i + 1; j < cans.length; j++) {
      const a = cans[i],
        b = cans[j];
      // Identical predictions cannot establish two distinct cans. Normally NMS
      // removes them already; also guard duplicated references/results here.
      const sameBox = ['x', 'y', 'width', 'height'].every(
        (key) => a.bbox[key] === b.bbox[key],
      );
      if (a !== b && !sameBox && boxesAreHugging(a.bbox, b.bbox, tolerance))
        return true;
    }
  }
  return false;
}

export class HugConfirmation {
  consecutiveResults = 0;
  confirmed = false;

  reset() {
    this.consecutiveResults = 0;
    this.confirmed = false;
  }

  update(detections) {
    this.consecutiveResults = hasHugPair(detections)
      ? Math.min(this.consecutiveResults + 1, HUG_REQUIRED_CONFIRMATIONS)
      : 0;
    if (
      !this.confirmed &&
      this.consecutiveResults >= HUG_REQUIRED_CONFIRMATIONS
    ) {
      this.confirmed = true;
      return true;
    }
    return false;
  }
}
