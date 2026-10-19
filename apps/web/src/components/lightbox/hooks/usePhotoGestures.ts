import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface PhotoViewState {
  scale: number;
  x: number;
  y: number;
}

interface PhotoGestureOptions {
  status: string;
  view: PhotoViewState;
  update: (scale: number, x?: number, y?: number) => void;
  navigate: (direction: number) => void;
}

export default function usePhotoGestures({
  status,
  view,
  update,
  navigate,
}: PhotoGestureOptions) {
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

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      status !== 'loaded' ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }

    pointerType.current = event.pointerType;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    points.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

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
    if (!points.current.has(event.pointerId)) {
      return;
    }

    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const [first, second] = [...points.current.values()];
    const { current } = gesture;

    const dx = first.x - current.x;
    const dy = first.y - current.y;

    if (Math.hypot(dx, dy) > 8) {
      current.moved = true;
    }

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
    if (!points.current.has(event.pointerId)) {
      return;
    }

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
      } else {
        lastTap.current = now;
      }
    }
  }

  return { start, move, end, pointerType };
}
