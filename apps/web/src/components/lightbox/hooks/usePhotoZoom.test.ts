import { act, renderHook } from '@testing-library/react';
import usePhotoZoom from './usePhotoZoom';

function sizedElement(element: HTMLElement, width: number, height: number) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
  });
}

describe('usePhotoZoom', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts fitted, applies zoom increments, clamps the zoom range, and resets', () => {
    const viewport = document.createElement('div');
    const image = document.createElement('img');
    sizedElement(viewport, 200, 200);
    sizedElement(image, 800, 400);
    const viewportRef = { current: viewport };
    const imageRef = { current: image };
    const { result } = renderHook(() => usePhotoZoom(viewportRef, imageRef));

    expect(result.current.view).toEqual({ scale: 1, x: 0, y: 0 });

    act(() => result.current.update(result.current.view.scale + 0.5));
    expect(result.current.view.scale).toBe(1.5);

    act(() => result.current.update(10));
    expect(result.current.view.scale).toBe(4);
    expect(result.current.maxZoom).toBe(4);

    act(() => result.current.update(-1));
    expect(result.current.view).toEqual({ scale: 1, x: 0, y: 0 });

    act(() => result.current.update(2));
    act(() => result.current.pan(75, -40));
    expect(result.current.view).toEqual({ scale: 2, x: 75, y: -40 });

    act(() => result.current.reset());
    expect(result.current.view).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('clamps translations to the image bounds and reports the matching pan limits', () => {
    const viewport = document.createElement('div');
    const image = document.createElement('img');
    sizedElement(viewport, 200, 200);
    sizedElement(image, 800, 400);
    const viewportRef = { current: viewport };
    const imageRef = { current: image };
    const { result } = renderHook(() => usePhotoZoom(viewportRef, imageRef));

    act(() => result.current.update(1.5, 1000, -1000));

    expect(result.current.view).toEqual({ scale: 1.5, x: 500, y: -200 });
    expect(result.current.panLimits()).toEqual({ x: 500, y: 200 });
  });

  it('resets on observer and window resize and cleans up both listeners', () => {
    const viewport = document.createElement('div');
    const image = document.createElement('img');
    let observerCallback: ResizeObserverCallback | undefined;
    const disconnects: ReturnType<typeof vi.fn>[] = [];
    const observe = vi.fn();
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
        disconnects.push(this.disconnect);
      }

      observe = observe;

      unobserve = vi.fn();

      disconnect = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const viewportRef = { current: viewport };
    const imageRef = { current: image };
    const { result, unmount } = renderHook(() =>
      usePhotoZoom(viewportRef, imageRef)
    );

    expect(observe).toHaveBeenCalledWith(viewport);
    act(() => result.current.update(2));
    act(() => observerCallback?.([], {} as ResizeObserver));
    expect(result.current.view.scale).toBe(1);

    act(() => result.current.update(2));
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current.view.scale).toBe(1);

    unmount();
    expect(disconnects.length).toBeGreaterThan(0);
    disconnects.forEach((disconnect) =>
      expect(disconnect).toHaveBeenCalledTimes(1)
    );
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
