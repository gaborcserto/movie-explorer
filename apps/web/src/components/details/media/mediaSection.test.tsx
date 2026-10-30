import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('renders the populated galleries in tabs with Backdrops selected by default', () => {
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
    expect(
      within(media).getByRole('tabpanel', { name: 'Backdrops' }).parentElement
    ).toHaveClass('tab-panel-stable');
    expect(
      within(media)
        .getAllByRole('heading')
        .map((heading) => heading.textContent)
    ).toEqual(['Media']);
    expect(
      within(media).getByRole('tab', { name: 'Backdrops' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(within(media).getByRole('tab', { name: 'Posters' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(
      within(media).getByRole('tab', { name: 'Videos & Trailers' })
    ).toHaveAttribute('aria-selected', 'false');
    expect(
      within(media).getByRole('tabpanel', { name: 'Backdrops' })
    ).toBeVisible();
    const postersTab = within(media).getByRole('tab', { name: 'Posters' });
    const videosTab = within(media).getByRole('tab', {
      name: 'Videos & Trailers',
    });
    expect(
      document.getElementById(postersTab.getAttribute('aria-controls')!)
    ).toHaveAttribute('hidden');
    expect(
      document.getElementById(videosTab.getAttribute('aria-controls')!)
    ).toHaveAttribute('hidden');
    expect(
      within(media).getByText('11 backdrops available')
    ).toBeInTheDocument();
    [
      'Show more backdrops for Example',
      'Show more posters for Example',
    ].forEach((name) => {
      const button = within(media).getByRole('button', { name, hidden: true });

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
    expect(screen.getByRole('tab', { name: 'Posters' })).toBeInTheDocument();
    expect(
      screen.getByRole('tabpanel', { name: 'Backdrops' })
    ).toHaveTextContent('No backdrops are available.');
  });

  it('switches tabs with keyboard input and retains gallery expansion state', () => {
    const gallery = Array.from({ length: 11 }, (_, index) => ({
      ...photo,
      fullUrl: `/image-${index}.jpg`,
    }));
    render(
      <MediaSection
        title="Example"
        resetKey={1}
        backdrops={gallery}
        posters={[photo]}
        videos={[video]}
      />
    );

    const backdropsTab = screen.getByRole('tab', { name: 'Backdrops' });
    fireEvent.click(
      within(screen.getByRole('tabpanel', { name: 'Backdrops' })).getByRole(
        'button',
        { name: 'Show more backdrops for Example' }
      )
    );
    expect(
      screen.getByRole('img', { name: 'Example backdrop 11' })
    ).toBeInTheDocument();

    backdropsTab.focus();
    fireEvent.keyDown(backdropsTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Posters' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Posters' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Posters' }), {
      key: 'End',
    });
    expect(
      screen.getByRole('tab', { name: 'Videos & Trailers' })
    ).toHaveFocus();
    expect(
      screen.getByRole('tabpanel', { name: 'Videos & Trailers' })
    ).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Backdrops' }));
    expect(
      screen.getByRole('img', { name: 'Example backdrop 11' })
    ).toBeInTheDocument();
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

    expect(screen.getByRole('tab', { name: 'Backdrops' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Backdrops unavailable.'
    );
    expect(screen.queryByText(/0 backdrops available/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /show more backdrops/i })
    ).not.toBeInTheDocument();
  });
});
