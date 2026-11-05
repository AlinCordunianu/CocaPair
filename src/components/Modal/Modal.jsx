import { useEffect, useId, useRef } from 'react';
import './Modal.scss';
import X from 'lucide-react/icons/x';

export function Modal({
  title,
  icon: StatusIcon,
  instructions = false,
  celebration = false,
  artwork,
  children,
  onClose,
}) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${instructions ? 'modal--instructions' : ''} ${celebration ? 'modal--celebration' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        className="icon-button modal__close"
        onClick={onClose}
        aria-label={
          celebration ? 'Close celebration and scan again' : 'Close dialog'
        }
      >
        <X className="icon" aria-hidden="true" />
      </button>
      {artwork ? <div className="modal__artwork">{artwork}</div> : null}
      {StatusIcon ? (
        <div className="modal__icon">
          <StatusIcon className="icon" aria-hidden="true" />
        </div>
      ) : null}
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
