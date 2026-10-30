import { act, render } from '@testing-library/react';

import useStablePanelHeight from './index';

function StablePanel({
  panelKey,
  height,
  present = true,
  nodeKey = 'panel',
}: {
  panelKey: string;
  height: number;
  present?: boolean;
  nodeKey?: string;
}) {
  const ref = useStablePanelHeight<HTMLDivElement>(panelKey);

  return present ? <div key={nodeKey} ref={ref} style={{ height }} /> : null;
}

test('keeps the previous panel height during a shrink transition, then releases it', () => {
  vi.useFakeTimers();
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

  act(() => vi.advanceTimersByTime(259));
  expect(panel.style.minHeight).toBe('120px');

  act(() => vi.advanceTimersByTime(1));
  expect(panel.style.minHeight).toBe('');
  vi.useRealTimers();

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

test('observes recovered and replaced nodes and disconnects each observer', () => {
  const observers: {
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  class Observer {
    observe = vi.fn();

    disconnect = vi.fn();

    unobserve = vi.fn();

    constructor(callback: ResizeObserverCallback) {
      observers.push({
        callback,
        observe: this.observe,
        disconnect: this.disconnect,
      });
    }
  }
  vi.stubGlobal('ResizeObserver', Observer);
  const measure = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function measured(this: HTMLElement) {
      return { height: Number.parseFloat(this.style.height) || 0 } as DOMRect;
    });
  const { rerender, unmount } = render(
    <StablePanel present={false} panelKey="cast" height={300} />
  );
  expect(observers).toHaveLength(0);

  rerender(<StablePanel panelKey="cast" height={300} />);
  expect(observers[0].observe).toHaveBeenCalledWith(
    document.querySelector('div[style]')
  );

  rerender(<StablePanel panelKey="cast" height={200} nodeKey="replacement" />);
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  expect(observers[1].observe).toHaveBeenCalledWith(
    document.querySelector('div[style]')
  );

  act(() => observers[1].callback([], {} as ResizeObserver));
  rerender(<StablePanel panelKey="crew" height={100} nodeKey="replacement" />);
  expect(
    document.querySelector<HTMLElement>('div[style]')?.style.minHeight
  ).toBe('200px');

  rerender(<StablePanel panelKey="cast" height={250} nodeKey="replacement" />);
  expect(
    document.querySelector<HTMLElement>('div[style]')?.style.minHeight
  ).toBe('');
  unmount();
  expect(observers[1].disconnect).toHaveBeenCalledTimes(1);
  measure.mockRestore();
  vi.unstubAllGlobals();
});
