import { render, screen, within } from '@testing-library/react';
import type { MediaPhoto, MediaVideo } from '@movie-explorer/contracts';

import MediaSection from './mediaSection';

const photo: MediaPhoto = {
  thumbnailUrl: '/small.jpg',
  fullUrl: '/large.jpg',
};
const video: MediaVideo = {
  key: 'trailer',
  name: 'Trailer',
  site: 'YouTube',
  url: 'https://youtu.be/abcdefghijk',
  thumbnailUrl: '/video.jpg',
};

describe('<MediaSection />', () => {
  it('renders populated subsections in the approved order', () => {
    const gallery = Array.from({ length: 11 }, (_, index) => ({
      ...photo,
      fullUrl: `/image-${index}.jpg`,
    }));

    render(
      <MediaSection
        title="Example"
        resetKey={1}
        backdrops={gallery}
        posters={gallery.map((item) => ({
          ...item,
          fullUrl: `/poster${item.fullUrl}`,
        }))}
        videos={[video]}
      />
    );

    const media = screen.getByRole('region', { name: 'Media' });
    const headings = within(media)
      .getAllByRole('heading')
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      'Media',
      'Backdrops',
      'Posters',
      'Videos & Trailers',
    ]);
    expect(
      within(media).getByText('11 backdrops available')
    ).toBeInTheDocument();
    expect(within(media).getByText('11 posters available')).toBeInTheDocument();
    expect(within(media).getByText('1 video available')).toBeInTheDocument();
    [
      'Show more backdrops for Example',
      'Show more posters for Example',
    ].forEach((name) => {
      const button = within(media).getByRole('button', { name });

      expect(button).toHaveTextContent('Show more');
      expect(button).not.toHaveClass('btn--action');
    });
  });

  it('omits successfully empty collections and the empty Media section', () => {
    const { rerender } = render(
      <MediaSection
        title="Example"
        resetKey={1}
        backdrops={[]}
        posters={[]}
        videos={[]}
        availability={{
          backdrops: { status: 'available' },
          posters: { status: 'available' },
          videos: { status: 'available' },
        }}
      />
    );

    expect(
      screen.queryByRole('heading', { name: 'Media' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/available$/)).not.toBeInTheDocument();

    rerender(
      <MediaSection
        title="Example"
        resetKey={1}
        backdrops={[]}
        posters={[photo]}
        videos={[]}
        availability={{
          backdrops: { status: 'available' },
          posters: { status: 'available' },
          videos: { status: 'available' },
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Posters' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Backdrops' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Videos & Trailers' })
    ).not.toBeInTheDocument();
  });

  it('keeps unavailable subsection recovery visible without an empty gallery', () => {
    render(
      <MediaSection
        title="Example"
        resetKey={1}
        backdrops={[]}
        posters={[]}
        videos={[]}
        availability={{ backdrops: { status: 'unavailable' } }}
        backdropsRecovery={<p role="status">Backdrops unavailable.</p>}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Backdrops' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Backdrops unavailable.'
    );
    expect(screen.queryByText(/0 backdrops available/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /show more backdrops/i })
    ).not.toBeInTheDocument();
  });
});
