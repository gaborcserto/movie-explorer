import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { FaXmark } from 'react-icons/fa6';

import useDrawerDialog from './useDrawerDialog';
import './drawer.scss';

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: DrawerProps) {
  const panel = useRef<HTMLElement>(null);
  const titleId = useId();

  useDrawerDialog({ panel, onClose });

  return createPortal(
    <div className={`drawer${open ? '' : ' is-closing'}`}>
      <button
        type="button"
        tabIndex={-1}
        className="drawer__backdrop"
        aria-label={`Dismiss ${title}`}
        onClick={onClose}
      />
      <section
        ref={panel}
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="drawer__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
            <FaXmark aria-hidden="true" />
          </button>
        </header>
        <div className="drawer__content">{children}</div>
        {footer && <footer className="drawer__footer">{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}
