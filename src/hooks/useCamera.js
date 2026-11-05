import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

export function cameraErrorState(error) {
  const name = error instanceof Error ? error.name : '';
  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError'
  )
    return 'permission-denied';
  if (
    [
      'NotFoundError',
      'DevicesNotFoundError',
      'NotReadableError',
      'TrackStartError',
      'OverconstrainedError',
    ].includes(name)
  )
    return 'camera-unavailable';
  return 'error';
}

export function useCamera(onError) {
  const [stream, setStream] = useState(null);
  const current = useRef(null);
  const generation = useRef(0);
  const reportError = useEffectEvent(onError);

  const stop = useCallback(() => {
    generation.current++;
    const active = current.current;
    current.current = null;
    active?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }, []);

  const start = useCallback(async () => {
    const request = ++generation.current;
    current.current?.getTracks().forEach((track) => track.stop());
    current.current = null;
    setStream(null);
    if (!navigator.mediaDevices?.getUserMedia)
      throw new DOMException(
        'Camera access needs HTTPS or localhost and a supported browser.',
        'NotFoundError',
      );
    const next = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (request !== generation.current) {
      next.getTracks().forEach((track) => track.stop());
      return false;
    }
    current.current = next;
    setStream(next);
    return true;
  }, []);

  useEffect(() => {
    if (!stream) return;

    const ended = () => {
      stop();
      reportError(
        'camera-unavailable',
        'The camera disconnected. Reconnect it and try again.',
      );
    };

    const tracks = stream.getVideoTracks();
    tracks.forEach((track) => track.addEventListener('ended', ended));
    return () =>
      tracks.forEach((track) => track.removeEventListener('ended', ended));
  }, [stream, stop]);

  useEffect(
    () => () => {
      generation.current++;
      current.current?.getTracks().forEach((track) => track.stop());
      current.current = null;
    },
    [],
  );

  return { stream, start, stop };
}
