export const MODEL_INPUT_SIZE = 640;
export const DETECTION_FRAME_INTERVAL = 5;
// The supplied model scores a plain red rectangle at 0.717 in browser inference.
// Start conservatively; validate real cans on the intended device before tuning.
export const DETECTION_CONFIDENCE_THRESHOLD = 0.7;
export const HUG_PROXIMITY_TOLERANCE = 0.05;
export const HUG_REQUIRED_CONFIRMATIONS = 3;
// This supplied export is the raw one-to-many head, with normalized xywh boxes.
export const NMS_IOU_THRESHOLD = 0.45;
export const MAX_DETECTIONS = 20;
export const CLASS_NAMES = ['coca_cola_can', 'coca_cola_zero_can'];
export const CLASS_LABELS = ['Coca-Cola', 'Coca-Cola Zero'];
