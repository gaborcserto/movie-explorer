import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import usePhotoGestures from './usePhotoGestures';

function pointer(
  id: number,
  x: number,
  y: number,
  pointerType = 'touch',
  button = 0
) {
  const setPointerCapture = vi.fn();
  const event = {
    pointerId: id,
    clientX: x,
    clientY: y,
    pointerType,
    button,
    currentTarget: { setPointerCapture },
  } as unknown as ReactPointerEvent<HTMLDivElement>;

  return { event, setPointerCapture };
}

describe('usePhotoGestures', () => {
  it('tracks started pointers, captures them, and ignores unsupported starts', () => {
    const update = vi.fn();
    const navigate = vi.fn();
    const { result, rerender } = renderHook(
      ({ status, scale }) =>
        usePhotoGestures({
          status,
          view: { scale, x: 0, y: 0 },
          update,
          navigate,
        }),
      { initialProps: { status: 'loading', scale: 2 } }
    );
    const loadingPointer = pointer(1, 10, 10);
    act(() => result.current.start(loadingPointer.event));
    expect(loadingPointer.setPointerCapture).not.toHaveBeenCalled();

    rerender({ status: 'loaded', scale: 2 });
    const secondaryMouseButton = pointer(2, 10, 10, 'mouse', 2);
    act(() => result.current.start(secondaryMouseButton.event));
    expect(secondaryMouseButton.setPointerCapture).not.toHaveBeenCalled();

    const activePointer = pointer(3, 10, 10, 'mouse', 0);
    act(() => result.current.start(activePointer.event));
    expect(activePointer.setPointerCapture).toHaveBeenCalledWith(3);
    act(() => result.current.move(pointer(4, 30, 30).event));
    expect(update).not.toHaveBeenCalled();
    act(() => result.current.move(pointer(3, 30, 35, 'mouse').event));
    expect(update).toHaveBeenCalledWith(2, 20, 25);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('pans with mouse and touch while zoomed', () => {
    const update = vi.fn();
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      usePhotoGestures({
        status: 'loaded',
        view: { scale: 2, x: 15, y: -10 },
        update,
        navigate,
      })
    );

    const mouseDown = pointer(1, 100, 100, 'mouse');
    act(() => result.current.start(mouseDown.event));
    act(() => result.current.move(pointer(1, 130, 125, 'mouse').event));
    act(() => result.current.end(pointer(1, 130, 125, 'mouse').event));
    expect(update).toHaveBeenLastCalledWith(2, 45, 15);

    act(() => result.current.start(pointer(2, 100, 100).event));
    act(() => result.current.move(pointer(2, 80, 110).event));
    expect(update).toHaveBeenLastCalledWith(2, -5, 0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates after a horizontal swipe at fit and ignores a short swipe', () => {
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      usePhotoGestures({
        status: 'loaded',
        view: { scale: 1, x: 0, y: 0 },
        update: vi.fn(),
        navigate,
      })
    );

    act(() => result.current.start(pointer(1, 300, 100).event));
    act(() => result.current.end(pointer(1, 250, 100).event));
    expect(navigate).not.toHaveBeenCalled();

    act(() => result.current.start(pointer(2, 300, 100).event));
    act(() => result.current.end(pointer(2, 200, 110).event));
    expect(navigate).toHaveBeenCalledWith(1);

    act(() => result.current.start(pointer(3, 100, 100).event));
    act(() => result.current.end(pointer(3, 200, 100).event));
    expect(navigate).toHaveBeenLastCalledWith(-1);
  });

  it('calculates pinch zoom and prevents navigation after a multi-touch gesture', () => {
    const update = vi.fn();
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      usePhotoGestures({
        status: 'loaded',
        view: { scale: 1, x: 0, y: 0 },
        update,
        navigate,
      })
    );

    act(() => result.current.start(pointer(1, 100, 100).event));
    act(() => result.current.start(pointer(2, 200, 100).event));
    act(() => result.current.move(pointer(2, 350, 100).event));
    expect(update).toHaveBeenCalledWith(2.5, 0, 0);
    act(() => result.current.end(pointer(2, 350, 100).event));
    act(() => result.current.end(pointer(1, 100, 100).event));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('zooms on a second touch tap within the existing 300 millisecond window', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const update = vi.fn();
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      usePhotoGestures({
        status: 'loaded',
        view: { scale: 1, x: 0, y: 0 },
        update,
        navigate,
      })
    );

    act(() => result.current.start(pointer(1, 50, 50).event));
    act(() => result.current.end(pointer(1, 50, 50).event));
    now += 299;
    act(() => result.current.start(pointer(2, 50, 50).event));
    act(() => result.current.end(pointer(2, 50, 50).event));

    expect(update).toHaveBeenCalledWith(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when a pointer is cancelled', () => {
    const navigate = vi.fn();
    const { result } = renderHook(() =>
      usePhotoGestures({
        status: 'loaded',
        view: { scale: 1, x: 0, y: 0 },
        update: vi.fn(),
        navigate,
      })
    );

    act(() => result.current.start(pointer(1, 300, 100).event));
    act(() => result.current.end(pointer(1, 100, 100).event, true));

    expect(navigate).not.toHaveBeenCalled();
  });
});
