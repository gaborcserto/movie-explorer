import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useLayoutEffect } from 'react';
import type { MovieDetails } from '@movie-explorer/contracts';
import { DetailsLowerContent } from '../details/detailsContent';
import PhotoLightbox from './photoLightbox';

const movie: MovieDetails = {
  id: 1,
  title: 'Movie',
  cast: [],
  genres: [],
  releaseDate: '',
  posterUrl: '/poster.jpg',
  photos: [
    { thumbnailUrl: '/thumb1.jpg', fullUrl: '/original1.jpg' },
    { thumbnailUrl: '/thumb2.jpg', fullUrl: '/original2.jpg' },
  ],
};

async function open() {
  const user = userEvent.setup();
  render(<DetailsLowerContent movieData={movie} />);
  const thumbnail = screen.getByAltText('Movie backdrop 1');
  await user.click(thumbnail);
  const dialog = screen.getByRole('dialog');
  const image = within(dialog).getByRole('img', { hidden: true });

  return { user, dialog, image, thumbnail };
}

function load(image: HTMLElement) {
  fireEvent.load(image);

  Object.defineProperties(image, {
    clientWidth: { configurable: true, value: 800 },
    clientHeight: { configurable: true, value: 400 },
  });
  const viewport = image.parentElement;

  if (!viewport) {
    throw new Error('Missing viewport');
  }

  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, value: 800 },
    clientHeight: { configurable: true, value: 600 },
  });

  return viewport;
}

function pointer(
  target: HTMLElement,
  type: string,
  id: number,
  x: number,
  y: number,
  pointerType = 'touch'
) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, {
    pointerId: id,
    clientX: x,
    clientY: y,
    pointerType,
    button: 0,
  });
  fireEvent(target, event);
}

let fullscreenElement: Element | null = null;
const exitFullscreen = vi.fn(async () => {
  fullscreenElement = null;
  document.dispatchEvent(new Event('fullscreenchange'));
});

beforeEach(() => {
  fullscreenElement = null;
  Object.defineProperty(Element.prototype, 'requestFullscreen', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperties(document, {
    fullscreenElement: { configurable: true, get: () => fullscreenElement },
    fullscreenEnabled: { configurable: true, value: true },
    exitFullscreen: { configurable: true, value: exitFullscreen },
  });
  exitFullscreen.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('photo lightbox', () => {
  it('clears obsolete full-resolution sources on navigation and close', async () => {
    const { user, image, thumbnail } = await open();
    await user.keyboard('{ArrowRight}');
    expect(image).not.toHaveAttribute('src');
    const next = within(screen.getByRole('dialog')).getByRole('img', {
      hidden: true,
    });
    expect(next).toHaveAttribute('src', '/original2.jpg');
    await user.keyboard('{Escape}');
    expect(next).not.toHaveAttribute('src');
    expect(thumbnail.closest('button')).toHaveFocus();
  });

  it('keeps the selected source through development effect replay', () => {
    render(
      <StrictMode>
        <PhotoLightbox
          photos={movie.photos ?? []}
          initialIndex={0}
          title="Movie"
          onClose={() => undefined}
        />
      </StrictMode>
    );
    expect(
      within(screen.getByRole('dialog')).getByRole('img', { hidden: true })
    ).toHaveAttribute('src', '/original1.jpg');
  });

  it.each(['preview', 'final'])(
    'handles %s completion first and enables zoom only for the original',
    async (first) => {
      const { dialog, image } = await open();
      const preview = dialog.querySelector('.image-preview');

      if (!preview) {
        throw new Error('Missing preview');
      }
      expect(preview).toHaveAttribute('src', '/thumb1.jpg');
      expect(preview).toHaveAttribute('aria-hidden', 'true');
      expect(image).toHaveAttribute('src', '/original1.jpg');
      expect(dialog.querySelectorAll('img')).toHaveLength(2);
      fireEvent.load(first === 'preview' ? preview : image);
      expect(
        screen.getByRole('button', { name: 'Zoom in' }).hasAttribute('disabled')
      ).toBe(first === 'preview');
      expect(preview).toHaveStyle({ opacity: first === 'preview' ? '1' : '0' });
      fireEvent.load(first === 'preview' ? image : preview);
      expect(preview).toHaveStyle({ opacity: '0' });
      expect(image).toHaveStyle({ opacity: '1' });
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
    }
  );

  it('recovers from preview failure and ignores stale events during rapid navigation', async () => {
    const { user, dialog, image } = await open();
    const preview = dialog.querySelector('.image-preview');

    if (!preview) {
      throw new Error('Missing preview');
    }
    fireEvent.error(preview);
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.load(image);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
    await user.keyboard('{ArrowRight}{ArrowLeft}');
    const current = within(dialog).getByRole('img', { hidden: true });
    fireEvent.load(image);
    fireEvent.load(preview);
    fireEvent.error(image);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(current).toHaveStyle({ opacity: '0' });
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    const currentPreview = dialog.querySelector('.image-preview');

    if (!currentPreview) {
      throw new Error('Missing preview');
    }
    fireEvent.load(currentPreview);
    expect(currentPreview).toHaveStyle({ opacity: '1' });
    fireEvent.error(current);
    expect(currentPreview).toHaveStyle({ opacity: '0' });
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load photo');
  });

  it('preserves cached original completion before passive effects run', () => {
    function CachedPhoto() {
      useLayoutEffect(() => {
        const image = document.querySelector('img[src="/original1.jpg"]');
        image?.dispatchEvent(new Event('load'));
      }, []);

      return (
        <PhotoLightbox
          photos={movie.photos ?? []}
          initialIndex={0}
          title="Movie"
          onClose={() => {}}
        />
      );
    }
    render(<CachedPhoto />);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('uses accessible icons for lightbox actions and keeps the zoom percentage visible', async () => {
    const { dialog } = await open();

    [
      'Previous photo',
      'Next photo',
      'Close photo viewer',
      'Enter fullscreen',
      'Zoom in',
      'Zoom out',
    ].forEach((label) => {
      const button = within(dialog).getByRole('button', { name: label });
      expect(
        button.querySelector('svg[aria-hidden="true"]')
      ).toBeInTheDocument();
    });
    expect(
      within(dialog).getByRole('button', { name: 'Reset zoom to fit' })
    ).toHaveTextContent('100%');
  });

  it('locks scrolling, traps focus, restores focus and survives repeated opening', async () => {
    document.body.style.overflow = 'auto';
    const { user, thumbnail, dialog } = await open();
    const close = screen.getByRole('button', { name: 'Close photo viewer' });
    expect(close).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(
      thumbnail.closest('.movie-details__lower')?.parentElement?.inert
    ).toBe(true);
    const previous = screen.getByRole('button', { name: 'Previous photo' });
    const next = screen.getByRole('button', { name: 'Next photo' });
    await user.click(next);
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(next).toHaveFocus();
    previous.focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(thumbnail.closest('button')).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
    const reopen = async () => {
      await user.click(thumbnail);
      expect(
        screen.getByRole('button', { name: 'Reset zoom to fit' })
      ).toHaveTextContent('100%');
      await user.click(
        screen.getByRole('button', { name: 'Close photo viewer' })
      );
      expect(thumbnail.closest('button')).toHaveFocus();
    };
    await reopen();
    await reopen();
    await reopen();
    document.body.style.overflow = '';
  });

  it('zooms, clamps pan, resets and resets on keyboard or button navigation', async () => {
    const { user, image } = await open();
    const viewport = load(image);
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(
      screen.getByRole('button', { name: 'Reset zoom to fit' })
    ).toHaveTextContent('150%');
    pointer(viewport, 'pointerdown', 1, 100, 100);
    pointer(viewport, 'pointermove', 1, 2000, 2000);
    pointer(viewport, 'pointerup', 1, 2000, 2000);
    expect(image.style.transform).toBe('translate(200px, 0px) scale(1.5)');
    expect(image).toHaveAttribute('src', '/original1.jpg');
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(image.style.transform).toContain('scale(1)');
    await user.dblClick(image);
    expect(image.style.transform).toContain('scale(2)');
    await user.click(screen.getByRole('button', { name: 'Reset zoom to fit' }));
    expect(image.style.transform).toBe('translate(0px, 0px) scale(1)');
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: 'Close photo viewer' })
    ).toHaveFocus();
    expect(
      within(screen.getByRole('dialog')).getByRole('img', { hidden: true })
    ).toHaveAttribute('src', '/original2.jpg');
    expect(
      screen.getByRole('button', { name: 'Reset zoom to fit' })
    ).toHaveTextContent('100%');
    load(within(screen.getByRole('dialog')).getByRole('img', { hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(
      screen.getByRole('button', { name: 'Reset zoom to fit' })
    ).toHaveTextContent('100%');
    await user.keyboard('{ArrowLeft}');
    expect(
      within(screen.getByRole('dialog')).getByRole('img', { hidden: true })
    ).toHaveAttribute('src', '/original2.jpg');
  });

  it('pans by accessible controls, clamps at edges, and resets with zoom', async () => {
    const { user, image } = await open();
    const viewport = load(image);
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 200 },
      clientHeight: { configurable: true, value: 200 },
    });
    const left = screen.getByRole('button', { name: 'Pan left' });
    const right = screen.getByRole('button', { name: 'Pan right' });
    const up = screen.getByRole('button', { name: 'Pan up' });
    const down = screen.getByRole('button', { name: 'Pan down' });
    expect(left).toBeDisabled();
    expect(right).toBeDisabled();
    expect(up).toBeDisabled();
    expect(down).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(left).toBeEnabled();
    expect(right).toBeEnabled();
    expect(up).toBeEnabled();
    expect(down).toBeEnabled();
    await user.click(down);
    expect(image.style.transform).toBe('translate(0px, 80px) scale(1.5)');
    await user.click(up);
    expect(image.style.transform).toBe('translate(0px, 0px) scale(1.5)');
    await user.click(right);
    expect(image.style.transform).toBe('translate(80px, 0px) scale(1.5)');
    await user.keyboard('{Enter}');
    expect(image.style.transform).toBe('translate(160px, 0px) scale(1.5)');
    await user.click(right);
    await user.click(right);
    await user.click(right);
    await user.click(right);
    await user.click(right);
    expect(image.style.transform).toBe('translate(500px, 0px) scale(1.5)');
    expect(right).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reset zoom to fit' }));
    expect(image.style.transform).toBe('translate(0px, 0px) scale(1)');
    expect(left).toBeDisabled();
    expect(right).toBeDisabled();
  });

  it('supports swipe, double tap and pinch without navigating during pan or cancelled gestures', async () => {
    const { image } = await open();
    let viewport = load(image);
    pointer(viewport, 'pointerdown', 1, 300, 100);
    pointer(viewport, 'pointermove', 1, 100, 100);
    pointer(viewport, 'pointerup', 1, 100, 100);
    const second = within(screen.getByRole('dialog')).getByRole('img', {
      hidden: true,
    });
    expect(second).toHaveAttribute('src', '/original2.jpg');
    viewport = load(second);
    pointer(viewport, 'pointerdown', 1, 200, 100);
    pointer(viewport, 'pointerup', 1, 200, 100);
    pointer(viewport, 'pointerdown', 1, 200, 100);
    pointer(viewport, 'pointerup', 1, 200, 100);
    expect(second.style.transform).toContain('scale(2)');
    fireEvent.doubleClick(second, { detail: 2 });
    expect(second.style.transform).toContain('scale(2)');
    pointer(viewport, 'pointerdown', 1, 300, 100);
    pointer(viewport, 'pointermove', 1, 50, 100);
    pointer(viewport, 'pointerup', 1, 50, 100);
    expect(second).toHaveAttribute('src', '/original2.jpg');
    pointer(viewport, 'pointerdown', 1, 100, 100);
    pointer(viewport, 'pointerdown', 2, 200, 100);
    pointer(viewport, 'pointermove', 2, 400, 100);
    expect(second.style.transform).toContain('scale(4)');
    pointer(viewport, 'pointerup', 2, 400, 100);
    pointer(viewport, 'pointerup', 1, 100, 100);
    expect(second).toHaveAttribute('src', '/original2.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom to fit' }));
    pointer(viewport, 'pointerdown', 1, 300, 100);
    pointer(viewport, 'pointercancel', 1, 100, 100);
    expect(second).toHaveAttribute('src', '/original2.jpg');
    pointer(viewport, 'pointerdown', 1, 100, 100);
    pointer(viewport, 'pointermove', 1, 300, 100);
    pointer(viewport, 'pointerup', 1, 300, 100);
    expect(
      within(screen.getByRole('dialog')).getByRole('img', { hidden: true })
    ).toHaveAttribute('src', '/original1.jpg');
  });

  it('loads only the selected original and handles image errors and navigation recovery', async () => {
    const { user, image } = await open();
    expect(screen.getByRole('status')).toHaveTextContent('Loading photo');
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(document.querySelector('img[src="/original2.jpg"]')).toBeNull();
    fireEvent.error(image);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load photo');
    expect(screen.queryByRole('status')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.queryByRole('alert')).toBeNull();
    load(within(screen.getByRole('dialog')).getByRole('img', { hidden: true }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
  });

  it('disables native fullscreen in unsupported browsers', async () => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    });
    await open();
    expect(
      screen.getByRole('button', { name: 'Enter fullscreen' })
    ).toBeDisabled();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('enters and exits fullscreen, follows browser changes, and closes separately', async () => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(async function request() {
        fullscreenElement = document.querySelector('[role="dialog"]');
        document.dispatchEvent(new Event('fullscreenchange'));
      }),
    });
    const { user, dialog } = await open();
    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(fullscreenElement).toBe(dialog);
    expect(
      screen.getByRole('button', { name: 'Exit fullscreen' })
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(fullscreenElement).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    await act(async () => {
      await exitFullscreen();
    });
    expect(
      screen.getByRole('button', { name: 'Enter fullscreen' })
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    await user.click(
      screen.getByRole('button', { name: 'Close photo viewer' })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fullscreenElement).toBeNull();
  });

  it('keeps the viewer usable when fullscreen is rejected or emits an error', async () => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('Denied')),
    });
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(screen.getByText(/Fullscreen is unavailable/)).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent(document, new Event('fullscreenerror'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
