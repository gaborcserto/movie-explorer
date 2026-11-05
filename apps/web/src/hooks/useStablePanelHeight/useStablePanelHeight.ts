import { useLayoutEffect, useRef, useState } from 'react';

const PANEL_HEIGHT_TRANSITION_MS = 220;

export default function useStablePanelHeight<T extends HTMLElement>(
  activeKey: string
) {
  const [panel, setPanel] = useState<T | null>(null);
  const activeKeyRef = useRef(activeKey);
  const observedHeightRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!panel) {
      return undefined;
    }

    const recordHeight = () => {
      observedHeightRef.current = panel.getBoundingClientRect().height;
    };

    recordHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(recordHeight);
    observer.observe(panel);

    return () => observer.disconnect();
  }, [panel]);

  // eslint-disable-next-line react-hooks/immutability -- This state value is a callback-ref DOM node; the layout effect intentionally animates its style, not React-owned data.
  useLayoutEffect(() => {
    if (activeKeyRef.current === activeKey) {
      return undefined;
    }

    activeKeyRef.current = activeKey;

    if (!panel) {
      return undefined;
    }

    const previousHeight = observedHeightRef.current;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // eslint-disable-next-line react-hooks/immutability -- Imperative DOM measurement/animation is the purpose of this layout effect.
    panel.style.minHeight = '';

    const nextHeight = panel.getBoundingClientRect().height;

    if (
      reduceMotion ||
      previousHeight === undefined ||
      nextHeight >= previousHeight
    ) {
      observedHeightRef.current = nextHeight;

      return undefined;
    }

    panel.style.minHeight = `${previousHeight}px`;

    const frame = window.requestAnimationFrame(() => {
      panel.style.minHeight = `${nextHeight}px`;
    });

    const timeout = window.setTimeout(() => {
      panel.style.minHeight = '';
      observedHeightRef.current = panel.getBoundingClientRect().height;
    }, PANEL_HEIGHT_TRANSITION_MS + 40);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      panel.style.minHeight = '';
    };
  }, [activeKey, panel]);

  return setPanel;
}
