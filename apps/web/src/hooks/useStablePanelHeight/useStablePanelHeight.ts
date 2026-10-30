import { useLayoutEffect, useRef } from 'react';

const PANEL_HEIGHT_TRANSITION_MS = 220;

export default function useStablePanelHeight<T extends HTMLElement>(
  activeKey: string
) {
  const panelRef = useRef<T>(null);
  const activeKeyRef = useRef(activeKey);
  const observedHeightRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const panel = panelRef.current;

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
  }, []);

  useLayoutEffect(() => {
    if (activeKeyRef.current === activeKey) {
      return undefined;
    }

    activeKeyRef.current = activeKey;
    const panel = panelRef.current;

    if (!panel) {
      return undefined;
    }

    const previousHeight = observedHeightRef.current;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    };
  }, [activeKey]);

  return panelRef;
}
