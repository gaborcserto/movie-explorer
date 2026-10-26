import { useEffect, useRef, useState } from 'react';
import { FaMagnifyingGlassMinus, FaMagnifyingGlassPlus } from 'react-icons/fa6';
import type { MoviePhoto } from '@movie-explorer/contracts';

import ImagePreview from '../utility/customImage/imagePreview';
import usePhotoGestures from './hooks/usePhotoGestures';
import usePhotoZoom from './hooks/usePhotoZoom';

export default function PhotoView({
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
  const [status, setStatus] = useState('loading');

  const { view, maxZoom, update, pan, panLimits, reset } = usePhotoZoom(
    viewport,
    image
  );
  const { start, move, end, pointerType } = usePhotoGestures({
    status,
    view,
    update,
    navigate,
  });

  useEffect(() => {
    const currentImage = image.current;

    // Restore after React's development effect replay, without restarting a
    // source that is already loading. Clearing a detached source lets the
    // browser cancel obsolete downloads on close or photo navigation.
    if (currentImage && !currentImage.hasAttribute('src')) {
      currentImage.src = photo.fullUrl;
    }

    return () => currentImage?.removeAttribute('src');
  }, [photo.fullUrl]);

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
          disabled={status !== 'loaded' || view.scale === maxZoom}
          onClick={() => update(view.scale + 0.5, view.x, view.y)}
        >
          <FaMagnifyingGlassPlus aria-hidden="true" focusable="false" />
        </button>
      </div>
      <div className="lightbox__pan" role="group" aria-label="Pan controls">
        {(
          [
            ['Pan left', -1, 0],
            ['Pan right', 1, 0],
            ['Pan up', 0, -1],
            ['Pan down', 0, 1],
          ] as const
        ).map(([label, dx, dy]) => {
          const limits = panLimits();

          const atBoundary =
            (dx < 0 && view.x <= -limits.x) ||
            (dx > 0 && view.x >= limits.x) ||
            (dy < 0 && view.y <= -limits.y) ||
            (dy > 0 && view.y >= limits.y);

          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              disabled={status !== 'loaded' || view.scale === 1 || atBoundary}
              onClick={() => pan(dx * 80, dy * 80)}
            >
              {label.replace('Pan ', '')}
            </button>
          );
        })}
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
          ) {
            update(view.scale > 1 ? 1 : 2);
          }
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
          className="image-original--progressive"
          decoding="async"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            opacity: status === 'loaded' ? 1 : 0,
          }}
          onLoad={() => setStatus('loaded')}
          onError={() => {
            setStatus('error');
            reset();
          }}
        />
        <ImagePreview
          key={photo.thumbnailUrl}
          src={photo.thumbnailUrl}
          visible={status === 'loading'}
          className="lightbox__preview"
        />
      </div>
    </>
  );
}
