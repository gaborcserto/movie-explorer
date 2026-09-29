import { useEffect } from 'react';
import type { ReactNode } from 'react';
import './customModal.scss';

interface CustomModalProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  titleId: string;
}

function CustomModal({ children, open, onClose, titleId }: CustomModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  return open ? (
    <div className="modal__overlay">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          onClick={onClose}
          className="modal__close"
          type="button"
          aria-label="Close dialog"
        >
          <span className="visually-hidden">Close dialog</span>
        </button>
        {children}
      </section>
    </div>
  ) : null;
}

export default CustomModal;
