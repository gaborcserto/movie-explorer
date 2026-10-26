import { act, fireEvent, renderHook } from '@testing-library/react';
import { useState } from 'react';
import useLightboxDialog from './useLightboxDialog';

function createDialog() {
  const root = document.createElement('div');
  root.setAttribute('role', 'dialog');
  const closeButton = document.createElement('button');
  closeButton.setAttribute('aria-label', 'Close');
  const lastButton = document.createElement('button');
  lastButton.setAttribute('aria-label', 'Next');
  root.append(closeButton, lastButton);
  document.body.append(root);

  return { root, closeButton, lastButton };
}

describe('useLightboxDialog', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  it('focuses the close button, contains focus, traps tab, and restores prior state on unmount', () => {
    const previousFocus = document.createElement('button');
    const background = document.createElement('div');
    const alreadyInert = document.createElement('div');
    Object.defineProperty(background, 'inert', {
      configurable: true,
      writable: true,
      value: false,
    });
    alreadyInert.inert = true;
    document.body.append(previousFocus, background, alreadyInert);
    previousFocus.focus();
    document.body.style.overflow = 'scroll';
    const { root, closeButton, lastButton } = createDialog();
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const onClose = vi.fn();
    const onEscapeFullscreen = vi.fn();
    const onFullscreenChange = vi.fn();
    const onFullscreenError = vi.fn();
    const { unmount } = renderHook(() =>
      useLightboxDialog({
        root: { current: root },
        closeButton: { current: closeButton },
        photosLength: 2,
        setIndex: vi.fn(),
        onClose,
        onEscapeFullscreen,
        onFullscreenChange,
        onFullscreenError,
      })
    );

    expect(closeButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    expect(background.inert).toBe(true);
    expect(alreadyInert.inert).toBe(true);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(lastButton).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    background.focus();
    expect(closeButton).toHaveFocus();

    unmount();

    expect(document.body.style.overflow).toBe('scroll');
    expect(background.inert).toBe(false);
    expect(alreadyInert.inert).toBe(true);
    expect(previousFocus).toHaveFocus();
    expect(removeListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'focusin',
      expect.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'fullscreenchange',
      expect.any(Function)
    );
    expect(removeListener).toHaveBeenCalledWith(
      'fullscreenerror',
      expect.any(Function)
    );

    root.remove();
    previousFocus.remove();
    background.remove();
    alreadyInert.remove();
  });

  it('closes on Escape and wraps left/right navigation around the photo count', () => {
    const { root, closeButton } = createDialog();
    const onClose = vi.fn();
    const onEscapeFullscreen = vi.fn();
    const { result, unmount } = renderHook(() => {
      const [index, setIndex] = useState(0);
      useLightboxDialog({
        root: { current: root },
        closeButton: { current: closeButton },
        photosLength: 3,
        setIndex,
        onClose,
        onEscapeFullscreen,
        onFullscreenChange: vi.fn(),
        onFullscreenError: vi.fn(),
      });

      return index;
    });

    act(() => fireEvent.keyDown(document, { key: 'ArrowLeft' }));
    expect(result.current).toBe(2);
    act(() => fireEvent.keyDown(document, { key: 'ArrowRight' }));
    expect(result.current).toBe(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEscapeFullscreen).not.toHaveBeenCalled();

    unmount();
    root.remove();
  });

  it('delegates Escape to fullscreen exit while the dialog is fullscreen', () => {
    const { root, closeButton } = createDialog();
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => root,
    });
    const onClose = vi.fn();
    const onEscapeFullscreen = vi.fn();
    const { unmount } = renderHook(() =>
      useLightboxDialog({
        root: { current: root },
        closeButton: { current: closeButton },
        photosLength: 2,
        setIndex: vi.fn(),
        onClose,
        onEscapeFullscreen,
        onFullscreenChange: vi.fn(),
        onFullscreenError: vi.fn(),
      })
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscapeFullscreen).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    unmount();
    root.remove();
  });
});
