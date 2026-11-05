import { Modal } from './Modal';
import CameraIcon from 'lucide-react/icons/camera';
import Cylinder from 'lucide-react/icons/cylinder';
import Heart from 'lucide-react/icons/heart';

const stepIcons = [CameraIcon, Cylinder, Heart];
const steps = [
  ['Allow camera access', 'Let us use your camera to scan in real time.'],
  [
    'Hold two Coca-Cola cans',
    'Original or Zero, in any combination. Keep both labels visible.',
  ],
  [
    'Bring your cans together',
    'Keep both cans in the frame and hold their hug steady.',
  ],
];

export function Instructions({ onContinue, onClose }) {
  return (
    <Modal title="How it works" instructions onClose={onClose}>
      <ol className="instructions">
        {steps.map(([heading, copy], index) => {
          const StepIcon = stepIcons[index];
          return (
            <li key={heading}>
              <div className="instructions__number">
                <StepIcon className="icon" aria-hidden="true" />
              </div>
              <div>
                <h3>
                  {index + 1}. {heading}
                </h3>
                <p>{copy}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <button className="button" onClick={onContinue}>
        Got it
      </button>
    </Modal>
  );
}
