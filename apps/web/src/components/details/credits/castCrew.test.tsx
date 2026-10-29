import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';

import DetailsContent, { DetailsLowerContent } from '../detailsContent';

const base: MovieDetails = {
  id: 1,
  title: 'Movie',
  cast: [],
  posterUrl: '',
  genres: [],
};
const actors = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Actor ${index + 1}`,
  character: `Character ${index + 1}`,
}));
const movie: MovieDetails = {
  ...base,
  castMembers: actors,
  directors: [
    { id: 1, name: 'Actor 1' },
    { id: 101, name: 'Director Two' },
    { id: 101, name: 'Director Two' },
  ],
  writers: [
    { id: 1, name: 'Actor 1', roles: ['Story'] },
    { id: 102, name: 'Writer', roles: ['Screenplay'] },
    { id: 102, name: 'Writer', roles: ['Story', 'Screenplay'] },
  ],
  producers: [
    { id: 1, name: 'Actor 1', roles: ['Producer'] },
    { id: 103, name: 'Producer', roles: ['Executive Producer'] },
  ],
};
const cast = () => within(screen.getByRole('region', { name: 'Cast' }));
const crew = () => within(screen.getByRole('region', { name: 'Crew' }));

function setup(data = movie) {
  return render(
    <MemoryRouter>
      <DetailsLowerContent movieData={data} />
    </MemoryRouter>
  );
}

test('shows ten actors, appends ten per click then a partial batch without duplicates or replacing cards', async () => {
  const user = userEvent.setup();
  setup();
  const first = cast().getByRole('link', { name: 'Actor 1' });
  expect(cast().getAllByRole('article')).toHaveLength(10);
  expect(cast().queryByText('Story')).toBeNull();
  expect(cast().queryByText('Director Two')).toBeNull();
  expect(cast().getByText('Character 1')).toBeVisible();
  expect(first).toHaveAccessibleDescription('Character 1');
  const more = cast().getByRole('button', { name: 'Show more cast' });
  expect(
    more.closest('.credit-preview-controls')?.previousElementSibling
  ).toHaveClass('cast-grid');
  more.focus();
  await user.keyboard('{Enter}');
  expect(cast().getAllByRole('article')).toHaveLength(20);
  expect(more).toHaveFocus();
  expect(cast().getByRole('link', { name: 'Actor 1' })).toBe(first);
  await user.keyboard('{Enter}');
  expect(cast().getAllByRole('article')).toHaveLength(25);
  expect(cast().getByRole('status')).toHaveTextContent('Showing 25 of 25');
  expect(cast().getByRole('status')).toHaveFocus();
  expect(cast().queryByRole('button', { name: 'Show more cast' })).toBeNull();
  const less = cast().getByRole('button', { name: 'Show less cast' });
  expect(less).toHaveAttribute('aria-expanded', 'true');
  expect(
    cast()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(actors.map((person) => `/person/${person.id}`));
  less.focus();
  await user.keyboard(' ');
  expect(cast().getAllByRole('article')).toHaveLength(10);
  expect(cast().getByRole('status')).toHaveFocus();
  expect(cast().queryByRole('button', { name: 'Show less cast' })).toBeNull();
});

test('shows Cast and Crew side by side with independent expansion state', async () => {
  const user = userEvent.setup();
  const largeCrewMovie: MovieDetails = {
    ...base,
    castMembers: actors,
    directors: Array.from({ length: 30 }, (_, index) => ({
      id: index + 100,
      name: `Director ${index + 1}`,
    })),
  };

  setup(largeCrewMovie);
  const layout = screen.getByRole('region', { name: 'Cast' }).parentElement;
  expect(layout).toHaveClass('cast-crew-layout');
  expect(cast().getByRole('heading', { name: 'Cast' })).toBeVisible();
  expect(crew().getByRole('heading', { name: 'Crew' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Show more cast' }));
  expect(cast().getByRole('status')).toHaveTextContent('Showing 20 of 25');
  expect(crew().getByRole('status')).toHaveTextContent('Showing 12 of 30');
  await user.click(screen.getByRole('button', { name: 'Show more crew' }));
  expect(crew().getByRole('status')).toHaveTextContent('Showing 24 of 30');
  expect(cast().getByRole('status')).toHaveTextContent('Showing 20 of 25');
});

test('resets expansion for a new movie and retains it when optional credits recover for the same movie', async () => {
  const user = userEvent.setup();
  const { rerender } = setup();
  await user.click(cast().getByRole('button'));
  rerender(
    <MemoryRouter>
      <DetailsLowerContent movieData={{ ...movie, description: 'Recovered' }} />
    </MemoryRouter>
  );
  expect(cast().getAllByRole('article')).toHaveLength(20);
  rerender(
    <MemoryRouter>
      <DetailsLowerContent
        movieData={{
          ...movie,
          id: 2,
          castMembers: actors.map((person) => ({
            ...person,
            name: `New ${person.name}`,
          })),
        }}
      />
    </MemoryRouter>
  );
  expect(cast().getAllByRole('article')).toHaveLength(10);
  expect(cast().queryByRole('link', { name: 'Actor 1' })).toBeNull();
  expect(cast().getByRole('status')).toHaveTextContent('Showing 10 of 25');
});

test('merges duplicate actor IDs and characters without merging crew roles or distinct same-name identities', () => {
  const input = {
    ...movie,
    castMembers: [
      { id: 1, name: 'Same', character: 'Hero' },
      { id: 1, name: 'Same', character: 'Narrator' },
      { id: 1, name: 'Same', character: 'Hero' },
      { id: 2, name: 'Same' },
      { name: 'Same' },
    ],
  };
  const original = JSON.stringify(input);
  setup(input);
  expect(cast().getAllByRole('article')).toHaveLength(3);
  expect(cast().getAllByRole('link')).toHaveLength(2);
  expect(cast().getByText('Hero · Narrator')).toBeVisible();
  expect(cast().queryByText('Producer')).toBeNull();
  expect(JSON.stringify(input)).toBe(original);
});

test('preserves lazy optimized portraits, missing and failed image fallbacks and full-card keyboard links', async () => {
  const user = userEvent.setup();
  setup({
    ...base,
    castMembers: [
      {
        id: 1,
        name: 'Portrait',
        profileUrl: '/portrait.jpg',
        profileSrcSet: '/small.jpg 1x, /large.jpg 2x, /original.jpg 3x',
      },
      { id: 2, name: 'Missing' },
    ],
  });
  const image = cast().getByRole('img', { name: 'Portrait' });
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(image).toHaveAttribute('srcset', '/small.jpg 1x, /large.jpg 2x');
  expect(cast().getByRole('img', { name: 'Missing' }).tagName).toBe('DIV');
  fireEvent.error(image);
  expect(cast().getByRole('img', { name: 'Portrait' }).tagName).toBe('DIV');
  const link = cast().getByRole('link', { name: 'Portrait' });
  expect(link).toHaveAttribute('href', '/person/1');
  expect(within(link).getAllByRole('heading')).toHaveLength(1);
  link.focus();
  await user.tab();
  expect(cast().getByRole('link', { name: 'Missing' })).toHaveFocus();
});

test('keeps Directors, Writers, and Producers grouped in the Crew section', () => {
  setup();
  const producers = crew().getByRole('region', { name: 'Producers' });
  expect(producers.closest('.crew-groups')).not.toBeNull();
  expect(
    crew()
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual(['Directors', 'Writers', 'Producers']);
  ['Directors', 'Writers', 'Producers'].forEach((role) => {
    const group = within(crew().getByRole('region', { name: role }));
    expect(group.getAllByRole('listitem')).toHaveLength(2);
    expect(group.getByRole('link', { name: 'Actor 1' })).toHaveAttribute(
      'href',
      '/person/1'
    );
  });
  expect(crew().queryByText('Screenplay · Story')).toBeNull();
  expect(crew().queryByText('Executive Producer')).toBeNull();
  expect(crew().queryByText('Director')).toBeNull();
  expect(crew().queryByRole('img')).toBeNull();
  expect(crew().queryByRole('article')).toBeNull();
  expect(cast().getByRole('heading', { name: 'Cast' })).toBeVisible();
});

test('does not create empty crew columns and displays empty available sections gracefully', () => {
  const { unmount } = setup({
    ...base,
    writers: [{ name: 'Unidentified', roles: ['Novel'] }],
  });
  expect(crew().queryByRole('heading', { name: 'Directors' })).toBeNull();
  expect(crew().queryByRole('heading', { name: 'Producers' })).toBeNull();
  expect(crew().queryByRole('link')).toBeNull();
  unmount();
  setup({
    ...base,
    sections: {
      credits: { status: 'available' },
      photos: { status: 'available' },
      videos: { status: 'available' },
    },
  });
  expect(cast().getByText('No cast available.')).toBeVisible();
  expect(cast().queryByRole('button')).toBeNull();
  expect(crew().getByText('No crew available.')).toBeVisible();
  expect(crew().queryByRole('heading', { level: 3 })).toBeNull();
});

test('wraps long crew names and omits all crew job labels', () => {
  setup({
    ...base,
    directors: [
      {
        id: 219,
        name: 'A Very Long Director Name That Must Wrap Without Truncation',
      },
    ],
    writers: [
      {
        id: 220,
        name: 'A Very Long Writer Name That Must Wrap Without Truncation',
        roles: ['Additional Literary Development and Story Consultation'],
      },
      { id: 221, name: 'Second Writer', roles: ['Screenplay'] },
      { id: 222, name: 'Third Writer', roles: ['Story'] },
    ],
  });
  const directorGroup = crew().getByRole('region', { name: 'Directors' });
  const directorLink = within(directorGroup).getByRole('link', {
    name: 'A Very Long Director Name That Must Wrap Without Truncation',
  });
  expect(directorLink).toHaveAttribute('href', '/person/219');
  expect(directorLink).not.toHaveAttribute('aria-describedby');
  expect(within(directorGroup).queryByText('Director')).toBeNull();

  const writerGroup = crew().getByRole('region', { name: 'Writers' });
  const writerLink = within(writerGroup).getByRole('link', {
    name: 'A Very Long Writer Name That Must Wrap Without Truncation',
  });
  expect(writerLink).toHaveAttribute('href', '/person/220');
  expect(writerLink).not.toHaveAttribute('aria-describedby');
  expect(writerGroup.textContent).not.toContain(
    'Additional Literary Development'
  );
  expect(writerGroup.textContent).not.toContain('Screenplay');
  expect(writerGroup.textContent).not.toContain('Story');
  expect(within(writerGroup).getAllByRole('listitem')).toHaveLength(3);
});

test('deduplicates unlinked crew names for display without inferring person IDs or merging valid same-name people', () => {
  setup({
    ...base,
    writers: [
      { name: 'Unknown', roles: ['Story'] },
      { name: 'Unknown', roles: ['Screenplay'] },
      { id: 1, name: 'Same Name', roles: ['Writer'] },
      { id: 2, name: 'Same Name', roles: ['Writer'] },
    ],
    producers: [{ name: 'Unknown', roles: ['Producer'] }],
  });
  const writers = within(crew().getByRole('region', { name: 'Writers' }));
  expect(writers.getAllByRole('listitem')).toHaveLength(3);
  expect(writers.getByText('Unknown')).toBeVisible();
  expect(writers.queryByText('Story')).toBeNull();
  expect(
    writers.getAllByRole('link').map((link) => link.getAttribute('href'))
  ).toEqual(['/person/1', '/person/2']);
  expect(
    within(crew().getByRole('region', { name: 'Producers' })).getByText(
      'Unknown'
    )
  ).toBeVisible();
});

test.each(['Directors', 'Writers', 'Producers'])(
  'supports keyboard Person Details navigation from %s',
  async (role) => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/', element: <DetailsLowerContent movieData={movie} /> },
      { path: '/person/:id', element: <h1>Person destination</h1> },
    ]);
    render(<RouterProvider router={router} />);
    within(crew().getByRole('region', { name: role }))
      .getByRole('link', { name: 'Actor 1' })
      .focus();
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Person destination' })
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/person/1');
  }
);

test('removes duplicate hero Credits and keeps the overview before Movie information', () => {
  render(
    <MemoryRouter>
      <DetailsContent
        movieData={{
          ...movie,
          description: 'Overview text',
          runtimeMinutes: 120,
          releaseDate: '2024-01-01',
        }}
      />
    </MemoryRouter>
  );
  expect(screen.getByText('Overview text')).toBeVisible();
  expect(screen.getByText('120 min')).toBeVisible();
  expect(screen.getByText('2024')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Credits' })).toBeNull();
  expect(screen.queryByText('Actor 1 · Actor 2')).toBeNull();
  expect(screen.queryByText('Actor 1')).toBeNull();
  const overviewHeading = screen.getByRole('heading', { name: 'Overview' });
  const informationHeading = screen.getByRole('heading', {
    name: 'Movie information',
  });
  expect(informationHeading).toBeVisible();
  expect(overviewHeading.compareDocumentPosition(informationHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING
  );
  expect(screen.queryByRole('link', { name: 'Actor 7' })).toBeNull();
});
