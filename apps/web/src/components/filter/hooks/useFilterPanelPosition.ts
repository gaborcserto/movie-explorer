import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

const MOBILE_BREAKPOINT = '(max-width: 767px)';

interface DesktopPositionOptions {
  anchor: DOMRect;
  panelWidth: number;
  viewportWidth: number;
  viewportHeight: number;
}

export function calculateDesktopPanelPosition({
  anchor,
  panelWidth,
  viewportWidth,
  viewportHeight,
}: DesktopPositionOptions) {
  const below = viewportHeight - anchor.bottom - 26;
  const above = anchor.top - 26;
  const flip = below < 300 && above > below;

  return {
    top: flip ? 'auto' : `${Math.max(16, anchor.bottom + 10)}px`,
    bottom: flip ? `${viewportHeight - anchor.top + 10}px` : 'auto',
    left: `${Math.max(16, Math.min(anchor.right - panelWidth, viewportWidth - panelWidth - 16))}px`,
    availableHeight: `${Math.max(0, flip ? above : below)}px`,
  };
}

export default function useFilterPanelPosition(
  panel: RefObject<HTMLDivElement | null>
) {
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.(MOBILE_BREAKPOINT).matches ?? false
  );

  useEffect(() => {
    const media = window.matchMedia?.(MOBILE_BREAKPOINT);
    const change = () => setMobile(media?.matches ?? false);

    media?.addEventListener('change', change);

    return () => media?.removeEventListener('change', change);
  }, []);

  useLayoutEffect(() => {
    const element = panel.current;

    if (!element) {
      return undefined;
    }

    const position = () => {
      const viewport = window.visualViewport;

      if (mobile) {
        const viewportHeight = viewport?.height ?? window.innerHeight;
        element.style.setProperty(
          '--filter-viewport-height',
          `${viewportHeight}px`
        );
        element.style.setProperty(
          '--filter-viewport-bottom',
          `${Math.max(0, window.innerHeight - viewportHeight - (viewport?.offsetTop ?? 0))}px`
        );

        return;
      }

      const anchor = element.parentElement?.getBoundingClientRect();

      if (!anchor) {
        return;
      }

      const calculatedPosition = calculateDesktopPanelPosition({
        anchor,
        panelWidth: element.offsetWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });

      element.style.top = calculatedPosition.top;
      element.style.bottom = calculatedPosition.bottom;
      element.style.left = calculatedPosition.left;
      element.style.setProperty(
        '--filter-available-height',
        calculatedPosition.availableHeight
      );
    };

    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);

    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [mobile, panel]);

  return mobile;
}
