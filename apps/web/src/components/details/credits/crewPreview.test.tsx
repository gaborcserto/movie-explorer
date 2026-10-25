import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { MovieDetails, SeriesDetails } from '@movie-explorer/contracts';

import { DetailsLowerContent } from '../detailsContent';
import SeriesSections from '../../../pages/series/seriesSections';

const movie: MovieDetails = {
  id: 1,
  title: 'Movie',
  genres: [],
  cast: [],
  posterUrl: '',
  directors: Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    name: `Crew ${index + 1}`,
  })),
  writers: [{ id: 1, name: 'Crew 1', roles: ['Story', 'Screenplay'] }],
};
const series: SeriesDetails = {
  mediaType: 'tv',
  id: 1,
  title: 'Series',
  originalTitle: null,
  firstAirDate: null,
  lastAirDate: null,
  posterUrl: null,
  backdropUrl: null,
  genres: [],
  description: null,
  originalLanguage: null,
  status: null,
  inProduction: null,
  seasonCount: null,
  episodeCount: null,
  episodeRuntimeMinutes: [],
  rating: null,
  voteCount: null,
  originCountries: [],
  creators: [],
  networks: [],
  productionCompanies: [],
  seasons: [],
  credits: {
    cast: [],
    crew: Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      name: `Crew ${index + 1}`,
      departments: [
        { department: 'Writing', totalEpisodeCount: 7 },
        { department: 'Production', totalEpisodeCount: 11 },
      ],
      jobs: [
        {
          creditId: `story-${index}`,
          job: 'Story',
          department: 'Writing',
          episodeCount: 3,
        },
        {
          creditId: `script-${index}`,
          job: 'Screenplay',
          department: 'Writing',
          episodeCount: 5,
        },
        {
          creditId: `producer-${index}`,
          job: 'Producer',
          department: 'Production',
          episodeCount: 11,
        },
      ],
    })),
    sections: { cast: { status: 'available' }, crew: { status: 'available' } },
  },
};

function setup(kind: 'movie' | 'series') {
  render(
    <MemoryRouter>
      {kind === 'movie' ? (
        <DetailsLowerContent movieData={movie} />
      ) : (
        <SeriesSections series={series} />
      )}
    </MemoryRouter>
  );
  if (kind === 'series')
    fireEvent.click(screen.getByRole('tab', { name: 'Crew' }));
  return kind === 'series'
    ? within(screen.getByRole('tabpanel', { name: 'Crew' }))
    : within(screen.getByRole('region', { name: 'Crew' }));
}

test.each(['movie', 'series'] as const)(
  'bounds %s crew by unique people, expands by twelve, preserves links and collapses with keyboard focus',
  async (kind) => {
    const user = userEvent.setup();
    const crew = setup(kind);
    const total = kind === 'movie' ? 30 : 50;
    const first = crew.getAllByRole('link', { name: 'Crew 1' })[0];
    const links = () =>
      new Set(
        crew.getAllByRole('link').map((link) => link.getAttribute('href'))
      );
    expect(crew.getByRole('status')).toHaveTextContent(
      `Showing 12 of ${total} crew members`
    );
    expect(links().size).toBe(12);
    expect(crew.queryByRole('link', { name: 'Crew 13' })).toBeNull();
    const more = crew.getByRole('button', { name: 'Show more crew' });
    expect(
      document.getElementById(more.getAttribute('aria-controls') ?? '')
    ).toHaveClass('crew-groups');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(
      more.closest('.credit-preview-controls')?.previousElementSibling
    ).toHaveClass('crew-groups');
    more.focus();
    await user.keyboard('{Enter}');
    expect(links().size).toBe(24);
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(crew.getAllByRole('link', { name: 'Crew 1' })[0]).toBe(first);
    expect(first).toHaveAttribute('href', '/person/1');
    if (kind === 'series') {
      await user.keyboard('{Enter}');
      expect(links().size).toBe(36);
      await user.keyboard('{Enter}');
      expect(links().size).toBe(48);
      expect(more).toHaveFocus();
    }
    await user.keyboard('{Enter}');
    expect(links().size).toBe(total);
    expect(crew.getByRole('status')).toHaveFocus();
    expect(crew.queryByRole('button', { name: 'Show more crew' })).toBeNull();
    const less = crew.getByRole('button', { name: 'Show less crew' });
    less.focus();
    await user.keyboard(' ');
    expect(links().size).toBe(12);
    expect(crew.getByRole('status')).toHaveFocus();
    expect(crew.queryByRole('button', { name: 'Show less crew' })).toBeNull();
  }
);

test('preserves movie department ordering and counts one linked person across multiple credited jobs', () => {
  const crew = setup('movie');
  expect(
    crew
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual(['Directors', 'Writers']);
  expect(crew.getAllByRole('link', { name: 'Crew 1' })).toHaveLength(2);
  expect(crew.getByRole('status')).toHaveTextContent(
    'Showing 12 of 30 crew members'
  );
});

test('preserves aggregate jobs and department episode totals without summing overlapping counts', () => {
  const crew = setup('series');
  expect(
    crew
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual(['Writing', 'Production']);
  expect(crew.getAllByText('Story \u2014 3 episodes')).toHaveLength(12);
  expect(crew.getAllByText('Screenplay \u2014 5 episodes')).toHaveLength(12);
  expect(crew.getAllByText('Department total: 7 episodes')).toHaveLength(12);
  expect(crew.getAllByText('Department total: 11 episodes')).toHaveLength(12);
  expect(crew.getAllByRole('link', { name: 'Crew 1' })).toHaveLength(2);
  expect(crew.getByRole('status')).toHaveTextContent(
    'Showing 12 of 50 crew members'
  );
});

test.each([0, 2])(
  'handles %i crew members without reveal controls',
  (count) => {
    if (!series.credits) throw new Error('Fixture credits missing');
    render(
      <MemoryRouter>
        <SeriesSections
          series={{
            ...series,
            credits: {
              ...series.credits,
              crew: series.credits.crew.slice(0, count),
            },
          }}
        />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Crew' }));
    const crew = within(screen.getByRole('tabpanel', { name: 'Crew' }));
    expect(crew.getByRole('status')).toHaveTextContent(
      `Showing ${count} of ${count} crew members`
    );
    expect(crew.queryByRole('button')).toBeNull();
    if (count === 0)
      expect(crew.getByText('No crew information available.')).toBeVisible();
  }
);

test('retains movie expansion on section recovery and resets it for another movie', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <MemoryRouter>
      <DetailsLowerContent movieData={movie} />
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Show more crew' }));
  rerender(
    <MemoryRouter>
      <DetailsLowerContent movieData={{ ...movie, description: 'Recovered' }} />
    </MemoryRouter>
  );
  expect(screen.getByText('Showing 24 of 30 crew members')).toBeVisible();
  rerender(
    <MemoryRouter>
      <DetailsLowerContent movieData={{ ...movie, id: 2 }} />
    </MemoryRouter>
  );
  expect(screen.getByText('Showing 12 of 30 crew members')).toBeVisible();
});
