import { DETECTION_CONFIDENCE_THRESHOLD } from '../constants/detection';

// Model scores are Float32: nominal 0.70 is 0.699999988079071.
// Compare against the configured cutoff represented at the same precision.
export function meetsConfidenceThreshold(
  confidence,
  threshold = DETECTION_CONFIDENCE_THRESHOLD,
) {
  return confidence >= Math.fround(threshold);
}
