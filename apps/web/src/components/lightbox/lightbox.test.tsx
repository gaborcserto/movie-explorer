import { render, screen } from '@testing-library/react';
import type { MoviePhoto, MovieVideo } from '@movie-explorer/contracts';

import Lightbox from './lightbox';

const photo: MoviePhoto = {
  fullUrl: '/photo.jpg',
  thumbnailUrl: '/photo-thumb.jpg',
};

const video: MovieVideo = {
  name: 'Trailer',
  site: 'YouTube',
  key: 'video-key',
  url: 'https://youtube.com/watch?v=video-key',
  thumbnailUrl: '/video-thumb.jpg',
};

test('renders the photo implementation for the photo variant', () => {
  render(
    <Lightbox
      type="photo"
      photos={[photo]}
      initialIndex={0}
      title="Movie"
      onClose={vi.fn()}
    />
  );

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('renders the video implementation for the video variant', () => {
  render(
    <Lightbox
      type="video"
      videos={[{ video, videoId: 'video-key' }]}
      initialIndex={0}
      title="Movie"
      onClose={vi.fn()}
    />
  );

  expect(screen.getByRole('dialog', { name: 'Trailer' })).toBeInTheDocument();
});
