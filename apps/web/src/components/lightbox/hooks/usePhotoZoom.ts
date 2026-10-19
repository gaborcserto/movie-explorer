import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

const MAX_ZOOM = 4;
const fit = { scale: 1, x: 0, y: 0 };

export default function usePhotoZoom(
  viewport: RefObject<HTMLDivElement | null>,
  image: RefObject<HTMLImageElement | null>
) {
  const [view, setView] = useState(fit);

  function update(scale: number, x = 0, y = 0) {
    const nextScale = Math.max(1, Math.min(MAX_ZOOM, scale));
    const box = viewport.current;
    const img = image.current;

    if (!box || !img) {
      return;
    }

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

  function pan(dx: number, dy: number) {
    update(view.scale, view.x + dx, view.y + dy);
  }

  function panLimits() {
    const box = viewport.current;
    const img = image.current;

    if (!box || !img) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max(0, (img.clientWidth * view.scale - box.clientWidth) / 2),
      y: Math.max(0, (img.clientHeight * view.scale - box.clientHeight) / 2),
    };
  }

  useEffect(() => {
    const reset = () => setView(fit);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(reset);
    if (viewport.current) {
      observer?.observe(viewport.current);
    }

    window.addEventListener('resize', reset);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', reset);
    };
  }, [viewport]);

  return {
    view,
    maxZoom: MAX_ZOOM,
    update,
    pan,
    panLimits,
    reset: () => setView(fit),
  };
}
