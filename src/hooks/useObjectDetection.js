import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react';
import { DETECTION_FRAME_INTERVAL } from '../constants/detection';
import { HugConfirmation, validCanDetections } from '../services/hugDetection';
import { objectDetector } from '../services/objectDetector';

export function useModel() {
  return useSyncExternalStore(
    objectDetector.subscribe,
    objectDetector.getSnapshot,
  );
}

export function useObjectDetection(
  video,
  active,
  scanSession,
  onDetections,
  onHugConfirmed,
  onError,
) {
  const hug = useRef(new HugConfirmation());
  const report = useEffectEvent(onDetections);
  const confirm = useEffectEvent(onHugConfirmed);
  const fail = useEffectEvent(onError);

  useEffect(() => {
    hug.current.reset();
    if (!active || !video) return;
    let cancelled = false,
      inProgress = false,
      frame = 0,
      animation = 0;
    let previousTime = -1;

    const tick = () => {
      if (cancelled) return;
      animation = requestAnimationFrame(tick);
      frame++;
      if (
        document.hidden ||
        frame % DETECTION_FRAME_INTERVAL !== 0 ||
        inProgress ||
        video.readyState < 2 ||
        !video.videoWidth ||
        video.currentTime === previousTime
      )
        return;
      previousTime = video.currentTime;
      inProgress = true;
      void objectDetector
        .detect(video)
        .then((detections) => {
          if (cancelled || !detections) return;
          const cans = validCanDetections(detections);
          report(cans);
          // Keep inference and overlays live even while the success dialog is open.
          // The confirmation latch only resets when this scan session restarts.
          if (hug.current.update(cans)) confirm();
        })
        .catch((error) => {
          if (!cancelled) {
            cancelled = true;
            cancelAnimationFrame(animation);
            fail(error);
          }
        })
        .finally(() => {
          inProgress = false;
        });
    };

    animation = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      hug.current.reset();
    };
  }, [active, video, scanSession]);
}
