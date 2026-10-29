import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MovieDetails } from '@movie-explorer/contracts';
import { DetailsLowerContent } from '../details/detailsContent';

const movie: MovieDetails = {
  id: 1,
  title: 'Sample Movie',
  cast: [],
  genres: [],
  releaseDate: '',
  posterUrl: '',
  videos: [
    {
      name: 'Official Trailer',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: '/trailer.jpg',
    },
    {
      name: 'Behind the Scenes',
      url: 'https://youtu.be/9bZkp7q19f0',
      thumbnailUrl: '/behind-scenes.jpg',
    },
  ],
};

async function renderVideoTab(movieData = movie) {
  const user = userEvent.setup();

  const result = render(<DetailsLowerContent movieData={movieData} />);
  await user.click(screen.getByRole('tab', { name: 'Videos & Trailers' }));

  return { user, ...result };
}

describe('video lightbox', () => {
  it('opens a lazy YouTube embed from the thumbnail and closes with its button', async () => {
    const { user } = await renderVideoTab();
    const trigger = screen.getByRole('button', {
      name: 'Play Official Trailer',
    });

    expect(document.querySelector('iframe')).toBeNull();

    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Official Trailer' });
    const iframe = within(dialog).getByTitle('Official Trailer');
    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&playsinline=1&rel=0'
    );
    expect(iframe).toHaveAttribute(
      'allow',
      expect.not.stringContaining('autoplay')
    );
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(
      screen.getByRole('button', { name: 'Close video player' })
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
  });

  it('closes with Escape and restores focus to the thumbnail', async () => {
    const { user } = await renderVideoTab();
    const trigger = screen.getByRole('button', {
      name: 'Play Official Trailer',
    });
    await user.click(trigger);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('navigates between videos, replaces the player, and disables edge controls', async () => {
    const { user } = await renderVideoTab();
    await user.click(
      screen.getByRole('button', { name: 'Play Official Trailer' })
    );
    const firstFrame = screen.getByTitle('Official Trailer');

    expect(
      screen.getByRole('button', { name: 'Previous video' })
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next video' }));

    const secondFrame = screen.getByTitle('Behind the Scenes');
    expect(secondFrame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/9bZkp7q19f0?autoplay=0&playsinline=1&rel=0'
    );
    expect(secondFrame).not.toBe(firstFrame);
    expect(screen.getByRole('button', { name: 'Next video' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous video' }));
    expect(screen.getByTitle('Official Trailer')).not.toBe(secondFrame);
  });

  it('supports arrow keys from the dialog and leaves interactive controls to their own keys', async () => {
    const { user } = await renderVideoTab();
    await user.click(
      screen.getByRole('button', { name: 'Play Official Trailer' })
    );
    const dialog = screen.getByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(screen.getByTitle('Behind the Scenes')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Previous video' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByTitle('Behind the Scenes')).toBeInTheDocument();
  });

  it('keeps unsupported or invalid video links external and tolerates missing videos', async () => {
    const externalMovie: MovieDetails = {
      ...movie,
      videos: [
        { name: 'External Trailer', url: 'https://vimeo.com/123456789' },
        { name: 'Invalid YouTube', url: 'https://youtube.com/watch?v=bad' },
      ],
    };
    const { rerender } = await renderVideoTab(externalMovie);

    expect(
      screen.getByRole('link', { name: 'External Trailer' })
    ).toHaveAttribute('href', 'https://vimeo.com/123456789');
    expect(
      screen.getByRole('link', { name: 'Invalid YouTube' })
    ).toHaveAttribute('href', 'https://youtube.com/watch?v=bad');
    expect(screen.queryByRole('button', { name: /Play/ })).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();

    rerender(
      <DetailsLowerContent movieData={{ ...movie, videos: undefined }} />
    );
    expect(
      screen.queryByRole('heading', { name: 'Videos & Trailers' })
    ).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });
});

test('describes keyboard exit from the cross-origin player without playback help', async () => {
  await renderVideoTab();
  await userEvent.click(
    screen.getByRole('button', { name: 'Play Official Trailer' })
  );
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAccessibleDescription(
    /Tab or Shift\+Tab.*Escape outside the player/
  );
  expect(screen.getByTitle('Official Trailer')).toHaveAccessibleDescription(
    /Tab or Shift\+Tab/
  );
  expect(screen.queryByText('Video not playing?')).toBeNull();
  expect(screen.queryByRole('link', { name: /watch on youtube/i })).toBeNull();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('keeps video thumbnails and missing-image placeholders independent of play names', async () => {
  await renderVideoTab({
    ...movie,
    videos: [
      movie.videos![0],
      { name: 'No thumbnail', url: 'https://youtu.be/9bZkp7q19f0' },
    ],
  });
  const first = screen.getByRole('button', { name: 'Play Official Trailer' });
  fireEvent.error(first.querySelector('img')!);
  expect(first.querySelector('img')).toBeNull();
  expect(first.querySelector('.image-placeholder')).toHaveAttribute(
    'aria-hidden',
    'true'
  );
  const missing = screen.getByRole('button', { name: 'Play No thumbnail' });
  expect(missing.querySelector('.image-placeholder')).not.toBeNull();
  await userEvent.click(first);
  expect(screen.getByRole('dialog')).toBeVisible();
});

test('keeps long video titles accessible without adding a visible header', async () => {
  const longTitle = 'An unusually long official trailer title '.repeat(6);
  await renderVideoTab({
    ...movie,
    videos: [{ ...movie.videos![0], name: longTitle }],
  });
  await userEvent.click(
    screen.getByRole('button', { name: /^Play An unusually long official/ })
  );

  const dialog = screen.getByRole('dialog');
  const title = dialog.querySelector('#video-lightbox-title');
  const toolbar = dialog.querySelector('.lightbox__toolbar');

  expect(dialog).toHaveAccessibleName(/^An unusually long official trailer/);
  expect(title).toHaveClass('visually-hidden');
  expect(toolbar).toContainElement(screen.getByText('1 / 1'));
  expect(toolbar).toContainElement(
    screen.getByRole('button', { name: 'Close video player' })
  );
});
