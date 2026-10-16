import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaAngleLeft, FaAngleRight, FaXmark } from 'react-icons/fa6';
import type { MovieVideo } from '@movie-explorer/contracts';

interface Props {
  videos: { video: MovieVideo; videoId: string }[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

export default function VideoLightbox({
  videos,
  initialIndex,
  title,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const root = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const video = videos[index];

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
    dialog?.focus();

    const focusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog?.contains(event.target))
        dialog?.focus();
    };
    const keydown = (event: KeyboardEvent) => {
      const { key, target } = event;
      if (key === 'Escape') {
        event.preventDefault();
        close.current();
        return;
      }

      if (key === 'Tab') {
        const controls = [
          ...(dialog?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), iframe'
          ) ?? []),
        ];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          !dialog?.contains(document.activeElement) ||
          document.activeElement === dialog
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
        return;
      }

      if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
      const { activeElement } = document;
      const interactiveSelector =
        'button, a, input, textarea, select, iframe, [contenteditable="true"]';
      const targetIsInteractive =
        target instanceof Element &&
        Boolean(target.closest(interactiveSelector));
      const activeElementIsInteractive =
        activeElement instanceof Element &&
        Boolean(activeElement.closest(interactiveSelector));
      if (targetIsInteractive || activeElementIsInteractive) return;

      event.preventDefault();
      setIndex((current) =>
        Math.max(
          0,
          Math.min(videos.length - 1, current + (key === 'ArrowLeft' ? -1 : 1))
        )
      );
    };

    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusInside);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusInside);
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element, position) => {
        element.inert = inertValues[position];
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [videos.length]);

  if (!video) return null;

  return createPortal(
    <div
      className="lightbox video-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-lightbox-title"
      ref={root}
      tabIndex={-1}
    >
      <div className="lightbox__toolbar">
        <h2 id="video-lightbox-title">
          {video.video.name || `${title} video`}
        </h2>
        <span aria-live="polite">
          {index + 1} / {videos.length}
        </span>
        <button
          type="button"
          ref={closeButton}
          aria-label="Close video player"
          onClick={onClose}
        >
          <FaXmark aria-hidden="true" focusable="false" />
        </button>
      </div>
      <div className="video-lightbox__player">
        <iframe
          key={video.videoId}
          title={video.video.name || `${title} video`}
          src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&playsinline=1&rel=0`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      {videos.length > 1 && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--previous"
            aria-label="Previous video"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            <FaAngleLeft aria-hidden="true" focusable="false" />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            aria-label="Next video"
            disabled={index === videos.length - 1}
            onClick={() =>
              setIndex((current) => Math.min(videos.length - 1, current + 1))
            }
          >
            <FaAngleRight aria-hidden="true" focusable="false" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
