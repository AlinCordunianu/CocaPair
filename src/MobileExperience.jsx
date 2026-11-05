import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from './components/Camera/Camera';
import { Landing } from './components/Landing/Landing';
import { Instructions } from './components/Modal/Instructions';
import { Modal } from './components/Modal/Modal';
import { cameraErrorState, useCamera } from './hooks/useCamera';
import { useModel, useObjectDetection } from './hooks/useObjectDetection';
import { objectDetector } from './services/objectDetector';
import { ProductPair } from './components/ProductPair/ProductPair';
import CameraIcon from 'lucide-react/icons/camera';
import Info from 'lucide-react/icons/info';
import RotateCcw from 'lucide-react/icons/rotate-ccw';

export default function MobileExperience() {
  const [state, setState] = useState('idle');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const [video, setVideo] = useState(null);
  const [detections, setDetections] = useState([]);
  const [scanSession, setScanSession] = useState(0);
  const generation = useRef(0);
  const model = useModel();

  const cameraError = useCallback((next, message) => {
    generation.current++;
    setState(next);
    setError(message);
    setModal(null);
  }, []);

  const camera = useCamera(cameraError);

  const close = useCallback(() => {
    generation.current++;
    camera.stop();
    setState('idle');
    setModal(null);
    setDetections([]);
  }, [camera.stop]);

  const runtimeError = useCallback(
    (failure) => {
      camera.stop();
      cameraError('error', failure.message);
    },
    [camera.stop, cameraError],
  );

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  useObjectDetection(
    video,
    state === 'scanning',
    scanSession,
    setDetections,
    () => setModal('success'),
    runtimeError,
  );

  const allowCamera = async () => {
    const request = ++generation.current;
    setModal(null);
    setError('');
    setState('requesting-permission');
    try {
      if (!(await camera.start()) || request !== generation.current) return;
      setState('model-loading');
      await objectDetector.load();
      if (request !== generation.current) return;
      setState('ready');
      setModal('instructions');
    } catch (failure) {
      if (request !== generation.current) return;
      camera.stop();
      cameraError(
        cameraErrorState(failure),
        failure instanceof Error ? failure.message : 'Please try again.',
      );
    }
  };

  const rescan = () => {
    setModal(null);
    setDetections([]);
    setScanSession((session) => session + 1);
    setState('scanning');
  };

  const busy = state === 'requesting-permission' || state === 'model-loading';
  const hasError =
    state === 'permission-denied' ||
    state === 'camera-unavailable' ||
    state === 'error';
  return (
    <main className="app" data-state={state} data-model-state={model.state}>
      {camera.stream && state === 'scanning' ? (
        <Camera
          stream={camera.stream}
          detections={detections}
          hugConfirmed={modal === 'success'}
          onVideo={setVideo}
          onError={runtimeError}
          onClose={close}
          onRescan={rescan}
        />
      ) : (
        <Landing
          onStart={() => setModal('permission')}
          onHelp={() => setModal('instructions')}
        />
      )}
      {modal === 'permission' ? (
        <Modal title="Let’s find your pair" icon={CameraIcon} onClose={close}>
          <p className="modal__body">
            Allow your camera to find Coca-Cola Original and Zero cans in real
            time. Your camera images stay on your device.
          </p>
          <div className="modal__actions">
            <button className="button" onClick={() => void allowCamera()}>
              Allow camera access
            </button>
            <button className="button button--secondary" onClick={close}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
      {modal === 'instructions' ? (
        <Instructions
          onClose={close}
          onContinue={() => {
            setModal(null);
            if (state === 'ready') rescan();
          }}
        />
      ) : null}
      {modal === 'success' ? (
        <Modal
          title="Congratulations!"
          celebration
          artwork={<ProductPair hug />}
          onClose={rescan}
        >
          <p className="modal__body">
            CocaPair detected! Your cans shared a hug. Good things go better
            together.
          </p>
          <div className="modal__actions">
            <button className="button" onClick={rescan}>
              <RotateCcw className="icon" aria-hidden="true" /> Scan again
            </button>
            <button className="button button--secondary" onClick={close}>
              Close camera
            </button>
          </div>
        </Modal>
      ) : null}
      {busy ? (
        <Modal
          title={
            state === 'model-loading'
              ? 'Preparing your detector'
              : 'Waiting for camera'
          }
          icon={CameraIcon}
          onClose={close}
        >
          <p className="modal__body" role="status">
            {state === 'model-loading'
              ? 'Loading the detector on your device. Your camera images stay with you.'
              : 'Choose Allow in your browser’s camera permission prompt.'}
            <span className="loading-dot"> …</span>
          </p>
          <div className="modal__actions">
            <button className="button button--secondary" onClick={close}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
      {hasError ? (
        <Modal
          title={
            state === 'permission-denied'
              ? 'Camera access needed'
              : state === 'camera-unavailable'
                ? 'Camera unavailable'
                : 'Something went wrong'
          }
          icon={Info}
          onClose={close}
        >
          <p className="modal__body">
            {state === 'permission-denied'
              ? "We couldn't access your camera. Please check your device settings and try again."
              : state === 'camera-unavailable'
                ? 'Your camera may be disconnected or in use. Close other camera apps and try again.'
                : error ||
                  'The detector could not start. Please try again in a current browser.'}
          </p>
          <div className="modal__actions">
            <button className="button" onClick={() => void allowCamera()}>
              Try again
            </button>
            <button className="button button--secondary" onClick={close}>
              Close
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
