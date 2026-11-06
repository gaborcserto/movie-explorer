import { useTranslation } from 'react-i18next';
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

import { i18n } from '../../i18n';
import { photoDescription } from '../../i18n/labels';
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
  useTranslation();

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
            i18n.t(
              'ui.unable_to_exit_fullscreen_use_your_browser_s_fullscreen_control'
            )
          )
        ),
    onFullscreenChange: (isFullscreen) => {
      setFullscreen(isFullscreen);
      setFullscreenError('');
    },
    onFullscreenError: () =>
      setFullscreenError(
        i18n.t(
          'ui.fullscreen_is_unavailable_you_can_continue_viewing_photos_here'
        )
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
        i18n.t(
          'ui.fullscreen_is_unavailable_you_can_continue_viewing_photos_here'
        )
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
      aria-label={i18n.t('messages.photoViewer', { title })}
      ref={root}
    >
      <div className="lightbox__toolbar">
        <span aria-live="polite">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          aria-label={
            fullscreen
              ? i18n.t('ui.exit_fullscreen')
              : i18n.t('ui.enter_fullscreen')
          }
          aria-pressed={fullscreen}
          disabled={!supported}
          title={
            supported
              ? undefined
              : i18n.t('ui.fullscreen_is_not_supported_in_this_browser')
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
          aria-label={i18n.t('ui.close_photo_viewer')}
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
        alt={
          (photos[index].alt
            ? photoDescription(photos[index].alt)
            : undefined) ??
          i18n.t('messages.stillNumber', { title, number: index + 1 })
        }
        navigate={navigate}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--previous"
            aria-label={i18n.t('ui.previous_photo')}
            onClick={() => navigate(-1)}
          >
            <FaChevronLeft aria-hidden="true" focusable="false" />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            aria-label={i18n.t('ui.next_photo')}
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
