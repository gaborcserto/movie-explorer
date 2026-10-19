import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCompress,
  FaExpand,
  FaXmark,
} from 'react-icons/fa6';
import type { MoviePhoto } from '@movie-explorer/contracts';

import PhotoView from './photoView';
import useLightboxDialog from './hooks/useLightboxDialog';

interface Props {
  photos: MoviePhoto[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

export default function PhotoLightbox({
  photos,
  initialIndex,
  title,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const navigate = (direction: number) =>
    setIndex(
      (previous) => (previous + direction + photos.length) % photos.length
    );

  useLightboxDialog({
    root,
    closeButton,
    photosLength: photos.length,
    setIndex,
    onClose,
    onEscapeFullscreen: () =>
      document
        .exitFullscreen()
        .catch(() =>
          setFullscreenError(
            'Unable to exit fullscreen. Use your browser’s fullscreen control.'
          )
        ),
    onFullscreenChange: (isFullscreen) => {
      setFullscreen(isFullscreen);
      setFullscreenError('');
    },
    onFullscreenError: () =>
      setFullscreenError(
        'Fullscreen is unavailable. You can continue viewing photos here.'
      ),
  });

  async function toggleFullscreen() {
    try {
      setFullscreenError('');

      if (document.fullscreenElement === root.current) {
        await document.exitFullscreen();
      } else {
        const dialog = root.current;
        await dialog?.requestFullscreen();
        if (
          dialog &&
          !dialog.isConnected &&
          document.fullscreenElement === dialog
        ) {
          await document.exitFullscreen();
        }
      }
    } catch {
      setFullscreenError(
        'Fullscreen is unavailable. You can continue viewing photos here.'
      );
    }
  }

  const supported =
    typeof document.documentElement.requestFullscreen === 'function' &&
    document.fullscreenEnabled !== false;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photo viewer`}
      ref={root}
    >
      <div className="lightbox__toolbar">
        <span aria-live="polite">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={fullscreen}
          disabled={!supported}
          title={
            supported
              ? undefined
              : 'Fullscreen is not supported in this browser'
          }
          onClick={toggleFullscreen}
        >
          {fullscreen ? (
            <FaCompress aria-hidden="true" focusable="false" />
          ) : (
            <FaExpand aria-hidden="true" focusable="false" />
          )}
        </button>
        <button
          type="button"
          ref={closeButton}
          aria-label="Close photo viewer"
          onClick={onClose}
        >
          <FaXmark aria-hidden="true" focusable="false" />
        </button>
      </div>
      {fullscreenError && (
        <p className="lightbox__notice" role="status">
          {fullscreenError}
        </p>
      )}
      <PhotoView
        key={`${index}-${photos[index].fullUrl}`}
        photo={photos[index]}
        alt={photos[index].alt ?? `${title} still ${index + 1}`}
        navigate={navigate}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--previous"
            aria-label="Previous photo"
            onClick={() => navigate(-1)}
          >
            <FaChevronLeft aria-hidden="true" focusable="false" />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            aria-label="Next photo"
            onClick={() => navigate(1)}
          >
            <FaChevronRight aria-hidden="true" focusable="false" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
