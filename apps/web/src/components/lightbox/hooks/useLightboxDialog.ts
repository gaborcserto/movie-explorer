import { useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

interface LightboxDialogOptions {
  root: RefObject<HTMLDivElement | null>;
  closeButton: RefObject<HTMLButtonElement | null>;
  photosLength: number;
  setIndex: Dispatch<SetStateAction<number>>;
  onClose: () => void;
  onEscapeFullscreen: () => void;
  onFullscreenChange: (fullscreen: boolean) => void;
  onFullscreenError: () => void;
}

export default function useLightboxDialog({
  root,
  closeButton,
  photosLength,
  setIndex,
  onClose,
  onEscapeFullscreen,
  onFullscreenChange,
  onFullscreenError,
}: LightboxDialogOptions) {
  const close = useRef(onClose);
  const escapeFullscreen = useRef(onEscapeFullscreen);
  const fullscreenChange = useRef(onFullscreenChange);
  const fullscreenError = useRef(onFullscreenError);

  close.current = onClose;
  escapeFullscreen.current = onEscapeFullscreen;
  fullscreenChange.current = onFullscreenChange;
  fullscreenError.current = onFullscreenError;

  useEffect(() => {
    const dialog = root.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const siblings = [...document.body.children].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== dialog
    );
    const inertValues = siblings.map((element) => element.inert);

    siblings.forEach((element) => {
      element.inert = true;
    });

    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const focusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog?.contains(event.target)) {
        closeButton.current?.focus();
      }
    };

    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (document.fullscreenElement === dialog) {
          escapeFullscreen.current();
        } else {
          close.current();
        }
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (document.activeElement?.closest('.lightbox__zoom')) {
          closeButton.current?.focus();
        }

        setIndex(
          (previous) =>
            (previous + (event.key === 'ArrowLeft' ? photosLength - 1 : 1)) %
            photosLength
        );
      }

      if (event.key === 'Tab') {
        const controls = [
          ...(dialog?.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)'
          ) ?? []),
        ];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!dialog?.contains(document.activeElement)) {
          event.preventDefault();
          first?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    const changed = () =>
      fullscreenChange.current(document.fullscreenElement === dialog);

    const failed = () => fullscreenError.current();

    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusInside);
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('fullscreenerror', failed);

    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusInside);
      document.removeEventListener('fullscreenchange', changed);
      document.removeEventListener('fullscreenerror', failed);

      if (document.fullscreenElement === dialog) {
        document.exitFullscreen().catch(() => {});
      }

      document.body.style.overflow = previousOverflow;

      siblings.forEach((element, position) => {
        element.inert = inertValues[position];
      });

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [photosLength, root, closeButton, setIndex]);
}
