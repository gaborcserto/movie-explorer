import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MovieDetails } from '@movie-explorer/contracts';
import PhotoPreview from './photoPreview';
import { DetailsLowerContent } from '../detailsContent';

const photos = Array.from({ length: 25 }, (_, index) => ({
  thumbnailUrl: `/thumb-${index}.jpg`,
  fullUrl: `/original-${index}.jpg`,
}));
const movie: MovieDetails = {
  id: 1,
  title: 'Movie',
  cast: [],
  genres: [],
  releaseDate: '',
  posterUrl: '',
};
const videos = Array.from({ length: 8 }, (_, index) => ({
  name: `Trailer ${index}`,
  url: `https://www.youtube.com/watch?v=dQw4w9WgXc${index}`,
}));

test.each([0, 2, 6, 8, 10])(
  'shows the photo count and a bounded preview for %i items',
  (count) => {
    render(<PhotoPreview photos={photos.slice(0, count)} title="Movie" />);
    expect(
      screen.queryAllByRole('button', { name: /View Movie photo/ })
    ).toHaveLength(Math.min(count, 10));
    expect(
      screen.queryByRole('button', { name: /Show more photos/ }) !== null
    ).toBe(count > 10);
    if (count) {
      expect(screen.getByText(`${count} photos available`)).toBeVisible();
    }
    expect(document.querySelector('img[src^="/original"]')).toBeNull();
  }
);

test('person photos reveal ten at a time, preserve order and hide the final partial batch control', async () => {
  const user = userEvent.setup();

  render(<PhotoPreview photos={photos} title="Person" />);
  const tiles = () =>
    screen.getAllByRole('button', { name: /View Person photo/ });
  expect(tiles()).toHaveLength(10);
  const more = screen.getByRole('button', {
    name: 'Show more photos for Person',
  });
  more.focus();
  await user.keyboard('{Enter}');
  expect(tiles()).toHaveLength(20);
  expect(more).toHaveFocus();
  await user.click(more);
  expect(tiles()).toHaveLength(25);
  expect(tiles()[24]).toHaveFocus();
  expect(tiles().map((tile) => tile.getAttribute('aria-label'))).toEqual(
    photos.map((_, index) => `View Person photo ${index + 1}`)
  );
  expect(
    screen.queryByRole('button', { name: 'Show more photos for Person' })
  ).toBeNull();
});

test('resets the visible photo count when the route key changes', async () => {
  const user = userEvent.setup();

  const { rerender } = render(
    <PhotoPreview photos={photos} title="First" resetKey={1} />
  );
  await user.click(
    screen.getByRole('button', { name: 'Show more photos for First' })
  );
  expect(
    screen.getAllByRole('button', { name: /View First photo/ })
  ).toHaveLength(20);
  rerender(<PhotoPreview photos={photos} title="Next" resetKey={2} />);
  expect(
    await screen.findAllByRole('button', { name: /View Next photo/ })
  ).toHaveLength(10);
});

test('lightbox navigates the complete backdrop collection without revealing grid items', async () => {
  const user = userEvent.setup();

  render(<DetailsLowerContent movieData={{ ...movie, photos }} />);
  const trigger = screen.getByRole('button', { name: 'View Movie backdrop 6' });
  trigger.focus();
  await user.keyboard('{Enter}');
  const dialog = screen.getByRole('dialog');
  await user.keyboard('{ArrowRight}'.repeat(8));
  expect(within(dialog).getByRole('img', { hidden: true })).toHaveAttribute(
    'src',
    '/original-13.jpg'
  );
  expect(within(dialog).getByText('14 / 25')).toBeVisible();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(
    screen.getAllByRole('button', { name: /View Movie backdrop/ })
  ).toHaveLength(6);
  expect(
    screen.getByRole('button', { name: 'Show more backdrops for Movie' })
  ).toBeVisible();
});

test('deduplicates photos and preserves missing and failed thumbnail fallbacks', () => {
  render(
    <PhotoPreview
      photos={[
        photos[0],
        photos[0],
        { thumbnailUrl: '', fullUrl: '/missing.jpg' },
        { thumbnailUrl: '/bad.jpg', fullUrl: '' },
      ]}
      title="Movie"
    />
  );
  expect(screen.getByText('2 photos available')).toBeVisible();
  fireEvent.error(screen.getByAltText('Movie still 1'));
  expect(screen.getByRole('img', { name: 'Movie still 1' })).toHaveClass(
    'image-placeholder'
  );
  expect(screen.getByRole('img', { name: 'Movie still 2' })).toHaveClass(
    'image-placeholder'
  );
});

test.each(['backdrops', 'posters'] as const)(
  'keeps %s separate with its configured initial count and full lightbox collection',
  async (category) => {
    const user = userEvent.setup();
    const posters = photos.map((photo) => ({
      ...photo,
      thumbnailUrl: `/poster${photo.thumbnailUrl}`,
      fullUrl: `/poster${photo.fullUrl}`,
    }));
    render(
      <DetailsLowerContent
        movieData={{ ...movie, backdrops: photos, posters }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Backdrops' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Posters' })).toBeVisible();
    expect(
      screen.getAllByRole('button', { name: /View Movie backdrop/ })
    ).toHaveLength(6);
    expect(
      screen.getAllByRole('button', { name: /View Movie poster/ })
    ).toHaveLength(10);
    expect(screen.getByText(`25 ${category} available`)).toBeVisible();
    expect(document.querySelector('.photo-grid--posters')).toHaveClass(
      'photo-grid--portraits'
    );
    expect(document.querySelector('img[src^="/original"]')).toBeNull();
    expect(document.querySelector('img[src^="/poster/original"]')).toBeNull();
    const trigger = screen.getByRole('button', {
      name: `View Movie ${category.slice(0, -1)} 5`,
    });
    await user.click(trigger);
    const expected = category === 'posters' ? posters : photos;
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { hidden: true })).toHaveAttribute(
      'src',
      expected[4].fullUrl
    );
    await user.keyboard('{ArrowRight}'.repeat(8));
    expect(within(dialog).getByRole('img', { hidden: true })).toHaveAttribute(
      'src',
      expected[12].fullUrl
    );
    expect(within(dialog).getByText('13 / 25')).toBeVisible();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  }
);

test('empty categories keep recovery messaging and one-item galleries omit navigation', async () => {
  const user = userEvent.setup();
  render(
    <DetailsLowerContent
      movieData={{
        ...movie,
        backdrops: [],
        posters: [photos[0]],
        videos: [],
        sections: {
          credits: { status: 'available' },
          photos: { status: 'available' },
          posters: { status: 'available' },
          videos: { status: 'available' },
        },
      }}
    />
  );
  expect(screen.getByText('No backdrops available.')).toBeVisible();
  expect(screen.getByText('0 backdrops available')).toBeVisible();
  expect(screen.getByText('0 videos available')).toBeVisible();
  expect(screen.getByText('1 poster available')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Show more/ })).toBeNull();
  const trigger = screen.getByRole('button', { name: 'View Movie poster 1' });
  await user.click(trigger);
  expect(within(screen.getByRole('dialog')).getByText('1 / 1')).toBeVisible();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
});

test('unknown video sites retain their title without an unsafe link or eager player', () => {
  render(
    <DetailsLowerContent
      movieData={{
        ...movie,
        videos: [
          { name: 'Interview', url: '', site: 'Unknown', key: 'media-id' },
        ],
      }}
    />
  );
  expect(screen.getByText('Interview')).toBeVisible();
  expect(screen.getByText('Playback unavailable for Unknown.')).toBeVisible();
  expect(screen.queryByRole('link')).toBeNull();
  expect(document.querySelector('iframe')).toBeNull();
});

test.each([0, 2, 4, 5])(
  'renders four initial videos and count for %i available',
  (count) => {
    render(
      <DetailsLowerContent
        movieData={{ ...movie, videos: videos.slice(0, count) }}
      />
    );
    expect(
      screen.queryAllByRole('button', { name: /Play Trailer/ })
    ).toHaveLength(Math.min(count, 4));
    expect(
      screen.queryByRole('button', { name: /Show more videos/ }) !== null
    ).toBe(count > 4);
    if (count) {
      expect(screen.getByText(`${count} videos available`)).toBeVisible();
    }
    expect(document.querySelector('iframe')).toBeNull();
  }
);

test('reveals videos in batches of four, handles a partial final batch, and preserves playback', async () => {
  const user = userEvent.setup();
  render(
    <DetailsLowerContent
      movieData={{
        ...movie,
        videos: [
          ...videos,
          { name: 'External clip', url: 'https://example.com/clip' },
        ],
      }}
    />
  );
  const more = screen.getByRole('button', { name: 'Show more videos' });
  await user.click(more);
  expect(document.querySelectorAll('.video-tile')).toHaveLength(8);
  expect(document.querySelector('iframe')).toBeNull();
  const trigger = screen.getByRole('button', { name: 'Play Trailer 4' });
  await user.click(trigger);
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(
    within(screen.getByRole('dialog')).getByTitle('Trailer 4')
  ).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXc4'));
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(more);
  expect(document.querySelectorAll('.video-tile')).toHaveLength(9);
  expect(screen.getByRole('link', { name: 'External clip' })).toHaveFocus();
  expect(screen.getByRole('link', { name: 'External clip' })).toHaveAttribute(
    'href',
    'https://example.com/clip'
  );
  expect(screen.queryByRole('button', { name: 'Show more videos' })).toBeNull();
});

test('resets the video reveal count when the movie changes', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <DetailsLowerContent movieData={{ ...movie, videos }} />
  );
  await user.click(screen.getByRole('button', { name: 'Show more videos' }));
  expect(document.querySelectorAll('.video-tile')).toHaveLength(8);
  rerender(<DetailsLowerContent movieData={{ ...movie, id: 2, videos }} />);
  expect(document.querySelectorAll('.video-tile')).toHaveLength(4);
  expect(
    screen.getByRole('button', { name: 'Show more videos' })
  ).toBeVisible();
});

test('keeps mixed video order and selects the supported player independently of tile position', async () => {
  const user = userEvent.setup();
  render(
    <DetailsLowerContent
      movieData={{
        ...movie,
        videos: [
          { name: 'External', url: 'https://vimeo.com/123456789' },
          { name: 'Unknown', url: '', site: 'Unknown' },
          { name: 'First', url: 'https://youtu.be/dQw4w9WgXcQ' },
          { name: 'Second', url: 'https://youtube.com/embed/9bZkp7q19f0' },
        ],
      }}
    />
  );
  expect(
    [...document.querySelectorAll('.video-tile')].map(
      (tile) => tile.querySelector('span')?.textContent
    )
  ).toEqual(['External', 'Unknown', 'First', 'Second']);

  const trigger = screen.getByRole('button', { name: 'Play Second' });
  await user.click(trigger);
  expect(screen.getByTitle('Second')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/9bZkp7q19f0?autoplay=0&playsinline=1&rel=0'
  );
  expect(within(screen.getByRole('dialog')).getByText('2 / 2')).toBeVisible();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  expect(screen.getByTitle('Second')).toBeInTheDocument();
});

test('closes active playback and resets previews on movie change without resetting same-movie updates', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <DetailsLowerContent movieData={{ ...movie, videos }} />
  );
  await user.click(screen.getByRole('button', { name: 'Show more videos' }));
  await user.click(screen.getByRole('button', { name: 'Play Trailer 4' }));

  rerender(
    <DetailsLowerContent movieData={{ ...movie, videos, title: 'Updated' }} />
  );
  expect(screen.getByRole('dialog', { name: 'Trailer 4' })).toBeVisible();

  rerender(<DetailsLowerContent movieData={{ ...movie, id: 2, videos }} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.querySelector('iframe')).toBeNull();
  expect(document.body.style.overflow).toBe('');
  expect(document.querySelectorAll('.video-tile')).toHaveLength(4);
  expect(
    screen.getByRole('button', { name: 'Show more videos' })
  ).toBeVisible();
});

test('unmounting active video playback restores scroll and background interaction', async () => {
  const user = userEvent.setup();
  const { container, unmount } = render(
    <DetailsLowerContent movieData={{ ...movie, videos }} />
  );
  const previousOverflow = document.body.style.overflow;
  const previousInert = container.inert;
  await user.click(screen.getByRole('button', { name: 'Play Trailer 0' }));
  expect(container.inert).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');

  unmount();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.querySelector('iframe')).toBeNull();
  expect(container.inert).toBe(previousInert);
  expect(document.body.style.overflow).toBe(previousOverflow);

  const outside = document.createElement('button');
  document.body.append(outside);
  outside.focus();
  fireEvent.keyDown(outside, { key: 'Escape' });
  expect(outside).toHaveFocus();
  outside.remove();
});
