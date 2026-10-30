import { act, render } from '@testing-library/react';

import useStablePanelHeight from './index';

function StablePanel({
  panelKey,
  height,
}: {
  panelKey: string;
  height: number;
}) {
  const ref = useStablePanelHeight<HTMLDivElement>(panelKey);

  return <div ref={ref} style={{ height }} />;
}

test('keeps the previous panel height during a shrink transition, then releases it', () => {
  let animateHeight: FrameRequestCallback | undefined;
  const frame = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      animateHeight = callback;

      return 1;
    });
  const measure = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function measurePanel(this: HTMLElement) {
      const contentHeight = Number.parseFloat(this.style.height) || 0;
      const minimumHeight = Number.parseFloat(this.style.minHeight) || 0;
      const height = Math.max(contentHeight, minimumHeight);

      return {
        bottom: height,
        height,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });

  const { rerender, unmount } = render(
    <StablePanel panelKey="cast" height={300} />
  );
  const panel = document.querySelector<HTMLDivElement>('div[style]');

  if (!panel) {
    throw new Error('The stable panel was not rendered.');
  }

  rerender(<StablePanel panelKey="crew" height={120} />);
  expect(panel.style.minHeight).toBe('300px');

  act(() => animateHeight?.(0));
  expect(panel.style.minHeight).toBe('120px');

  unmount();
  frame.mockRestore();
  measure.mockRestore();
});

test('does not preserve a temporary height when reduced motion is enabled', () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  const measure = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function measureReducedPanel(this: HTMLElement) {
      const height = Number.parseFloat(this.style.height) || 0;

      return {
        bottom: height,
        height,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });

  const { rerender, unmount } = render(
    <StablePanel panelKey="cast" height={300} />
  );
  const panel = document.querySelector<HTMLDivElement>('div[style]');

  if (!panel) {
    throw new Error('The stable panel was not rendered.');
  }

  rerender(<StablePanel panelKey="crew" height={120} />);
  expect(panel.style.minHeight).toBe('');

  unmount();
  window.matchMedia = originalMatchMedia;
  measure.mockRestore();
});
