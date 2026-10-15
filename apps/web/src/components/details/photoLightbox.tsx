import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCompress,
  FaExpand,
  FaMagnifyingGlassMinus,
  FaMagnifyingGlassPlus,
  FaXmark,
} from 'react-icons/fa6';
import type { MoviePhoto } from '@movie-explorer/contracts';

interface Props {
  photos: MoviePhoto[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}

const MAX_ZOOM = 4;
const fit = { scale: 1, x: 0, y: 0 };

function PhotoView({
  photo,
  alt,
  navigate,
}: {
  photo: MoviePhoto;
  alt: string;
  navigate: (direction: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [view, setView] = useState(fit);
  const [status, setStatus] = useState('loading');
  const points = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    x: 0,
    y: 0,
    distance: 0,
    scale: 1,
    panX: 0,
    panY: 0,
    moved: false,
    multiple: false,
  });
  const lastTap = useRef(0);
  const pointerType = useRef('mouse');

  function update(scale: number, x = 0, y = 0) {
    const nextScale = Math.max(1, Math.min(MAX_ZOOM, scale));
    const box = viewport.current;
    const img = image.current;
    if (!box || !img) return;
    const maxX = Math.max(
      0,
      (img.clientWidth * nextScale - box.clientWidth) / 2
    );
    const maxY = Math.max(
      0,
      (img.clientHeight * nextScale - box.clientHeight) / 2
    );
    setView({
      scale: nextScale,
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    });
  }

  useEffect(() => {
    const reset = () => setView(fit);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(reset);
    if (viewport.current) observer?.observe(viewport.current);
    window.addEventListener('resize', reset);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', reset);
    };
  }, []);

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      status !== 'loaded' ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return;
    pointerType.current = event.pointerType;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...points.current.values()];
    gesture.current = {
      x: first.x,
      y: first.y,
      distance: second ? Math.hypot(second.x - first.x, second.y - first.y) : 0,
      scale: view.scale,
      panX: view.x,
      panY: view.y,
      moved: false,
      multiple: points.current.size > 1,
    };
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [first, second] = [...points.current.values()];
    const { current } = gesture;
    const dx = first.x - current.x;
    const dy = first.y - current.y;
    if (Math.hypot(dx, dy) > 8) current.moved = true;
    if (second && current.distance > 0) {
      current.moved = true;
      update(
        (current.scale * Math.hypot(second.x - first.x, second.y - first.y)) /
          current.distance,
        current.panX + dx,
        current.panY + dy
      );
    } else if (view.scale > 1) {
      update(view.scale, current.panX + dx, current.panY + dy);
    }
  }

  function end(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    if (!points.current.has(event.pointerId)) return;
    points.current.delete(event.pointerId);
    const { current } = gesture;
    if (points.current.size || current.multiple || cancelled) {
      current.multiple = true;
      lastTap.current = 0;
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (
      current.scale === 1 &&
      Math.abs(dx) > 50 &&
      Math.abs(dx) > Math.abs(dy) * 1.5
    ) {
      lastTap.current = 0;
      navigate(dx < 0 ? 1 : -1);
    } else if (!current.moved && event.pointerType !== 'mouse') {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        update(view.scale > 1 ? 1 : 2);
        lastTap.current = 0;
      } else lastTap.current = now;
    }
  }

  return (
    <>
      <div className="lightbox__zoom" role="group" aria-label="Zoom controls">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={status !== 'loaded' || view.scale === 1}
          onClick={() => update(view.scale - 0.5, view.x, view.y)}
        >
          <FaMagnifyingGlassMinus aria-hidden="true" focusable="false" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom to fit"
          disabled={status !== 'loaded'}
          onClick={() => update(1)}
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={status !== 'loaded' || view.scale === MAX_ZOOM}
          onClick={() => update(view.scale + 0.5, view.x, view.y)}
        >
          <FaMagnifyingGlassPlus aria-hidden="true" focusable="false" />
        </button>
      </div>
      <div
        className={`lightbox__viewport${view.scale > 1 ? ' lightbox__viewport--zoomed' : ''}`}
        ref={viewport}
        role="presentation"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={(event) => end(event)}
        onPointerCancel={(event) => end(event, true)}
        onLostPointerCapture={(event) => end(event, true)}
        onDoubleClick={(event) => {
          if (
            status === 'loaded' &&
            event.detail === 2 &&
            pointerType.current === 'mouse'
          )
            update(view.scale > 1 ? 1 : 2);
        }}
      >
        {status === 'loading' && <p role="status">Loading photo…</p>}
        {status === 'error' && (
          <p role="alert">
            Unable to load photo. Try another photo or reopen the viewer.
          </p>
        )}
        <img
          ref={image}
          src={photo.fullUrl}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            visibility: status === 'loaded' ? 'visible' : 'hidden',
          }}
          onLoad={() => setStatus('loaded')}
          onError={() => {
            setStatus('error');
            setView(fit);
          }}
        />
      </div>
    </>
  );
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
  const close = useRef(onClose);
  close.current = onClose;
  const navigate = (direction: number) =>
    setIndex(
      (previous) => (previous + direction + photos.length) % photos.length
    );

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
      if (event.target instanceof Node && !dialog?.contains(event.target))
        closeButton.current?.focus();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (document.fullscreenElement === dialog) {
          document
            .exitFullscreen()
            .catch(() =>
              setFullscreenError(
                'Unable to exit fullscreen. Use your browser’s fullscreen control.'
              )
            );
        } else close.current();
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (document.activeElement?.closest('.lightbox__zoom'))
          closeButton.current?.focus();
        setIndex(
          (previous) =>
            (previous + (event.key === 'ArrowLeft' ? photos.length - 1 : 1)) %
            photos.length
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
    const changed = () => {
      setFullscreen(document.fullscreenElement === dialog);
      setFullscreenError('');
    };
    const failed = () =>
      setFullscreenError(
        'Fullscreen is unavailable. You can continue viewing photos here.'
      );
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focusInside);
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('fullscreenerror', failed);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('focusin', focusInside);
      document.removeEventListener('fullscreenchange', changed);
      document.removeEventListener('fullscreenerror', failed);
      if (document.fullscreenElement === dialog)
        document.exitFullscreen().catch(() => {});
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element, position) => {
        element.inert = inertValues[position];
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [photos.length]);

  async function toggleFullscreen() {
    try {
      setFullscreenError('');
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else {
        const dialog = root.current;
        await dialog?.requestFullscreen();
        if (
          dialog &&
          !dialog.isConnected &&
          document.fullscreenElement === dialog
        )
          await document.exitFullscreen();
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
