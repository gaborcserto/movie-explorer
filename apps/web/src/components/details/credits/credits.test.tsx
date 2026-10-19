import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import type { MovieDetails, PersonDetails } from '@movie-explorer/contracts';
import DetailsContent, { DetailsLowerContent } from '../detailsContent';
import App from '../../../App';

const movie: MovieDetails = {
  id: 10,
  title: 'Movie with credits',
  posterUrl: '/poster.jpg',
  genres: [],
  cast: [],
  director: 'Legacy Director',
};

const structured: MovieDetails = {
  ...movie,
  cast: [
    'Actor One',
    'Director One',
    'Same Name',
    'Same Name',
    'Unknown Actor',
  ],
  directors: [
    {
      id: 11,
      name: 'Director One',
      profileUrl: '/director.jpg',
      profileSrcSet: '/director-small.jpg 1x, /director-large.jpg 2x',
    },
    { id: 12, name: 'Director Two' },
    { name: 'Unknown Director' },
  ],
  castMembers: [
    { id: 21, name: 'Actor One', character: 'Hero', profileUrl: '/actor.jpg' },
    { id: 11, name: 'Director One', character: 'Narrator' },
    { id: 21, name: 'Actor One', character: 'Villain' },
    { id: 21, name: 'Actor One', character: 'Hero' },
    { id: 22, name: 'Same Name' },
    { id: 23, name: 'Same Name' },
    { name: 'Unknown Actor' },
  ],
};

function renderCredits(data = structured) {
  return render(
    <MemoryRouter
      initialEntries={[
        '/movie/10?sorting=title&personView=crew&personRole=job%3ADirector',
      ]}
    >
      <DetailsContent movieData={data} />
      <DetailsLowerContent movieData={data} />
    </MemoryRouter>
  );
}

function cards() {
  return within(screen.getByRole('region', { name: 'Cast' }));
}

function crew() {
  return within(screen.getByRole('region', { name: 'Crew' }));
}

function crewGroup(name: 'Directors' | 'Writers' | 'Producers') {
  return within(crew().getByRole('region', { name }));
}

test('renders structured cast and ordered crew groups with Person Details links', () => {
  renderCredits();
  expect(screen.getByRole('heading', { name: 'Cast' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Crew' })).toBeVisible();
  expect(
    cards()
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual([
    'Actor One',
    'Director One',
    'Same Name',
    'Same Name',
    'Unknown Actor',
  ]);
  expect(
    cards()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/person/21', '/person/11', '/person/22', '/person/23']);
  expect(
    cards().getByRole('link', { name: 'Actor One' })
  ).toHaveAccessibleDescription('Hero · Villain');
  expect(
    crew()
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
  ).toEqual(['Directors']);
  expect(
    crewGroup('Directors')
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/person/11', '/person/12']);
  expect(crewGroup('Directors').getByText('Unknown Director')).toBeVisible();
  expect(crew().queryByText('Director')).toBeNull();
  expect(screen.queryByText('Legacy Director')).toBeNull();
});

test.each([undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'keeps invalid or missing person ID %s as plain text',
  (id) => {
    renderCredits({
      ...movie,
      directors: [{ id, name: 'Unlinked Director' }],
      castMembers: [{ id, name: 'Unlinked Actor' }],
    });
    expect(crewGroup('Directors').getByText('Unlinked Director')).toBeVisible();
    expect(cards().getByText('Unlinked Actor')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
    expect(cards().getAllByRole('article')).toHaveLength(1);
    expect(cards().queryByRole('link')).toBeNull();
  }
);

test.each([undefined, []])(
  'preserves legacy cast names and omits empty Crew when structured data is %j',
  (empty) => {
    renderCredits({
      ...movie,
      director: 'Director A, Director B',
      directors: empty,
      cast: [' Actor A ', 'Actor B'],
      castMembers: empty,
    });
    expect(screen.queryByText('Director A, Director B')).toBeNull();
    expect(cards().getAllByRole('article')).toHaveLength(2);
    expect(
      cards()
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Actor A', 'Actor B']);
    expect(cards().queryByRole('link')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Crew' })).toBeNull();
  }
);

test('preserves unmatched legacy cast names in partial structured responses without inferring IDs', () => {
  renderCredits({
    ...movie,
    cast: ['Same', 'Same', 'Legacy Only'],
    castMembers: [{ id: 1, name: 'Same' }],
  });
  expect(cards().getAllByRole('article')).toHaveLength(3);
  expect(
    cards()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/person/1']);
});

test.each(['crew director', 'cast member', 'card portrait'])(
  'supports movie → person → filmography movie navigation and history from %s',
  async (source) => {
    const user = userEvent.setup();
    const person: PersonDetails = {
      id: 11,
      name: 'Director One',
      filmography: [{ ...movie, crewCredits: [{ job: 'Director' }] }],
    };
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async (url) =>
        ({
          ok: true,
          json: async () =>
            String(url).includes('/api/v1/persons/') ? person : structured,
        }) as Response
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const router = createMemoryRouter([{ path: '*', element: <App /> }], {
        initialEntries: ['/movie/10?sorting=title&personSort=oldest'],
      });
      render(<RouterProvider router={router} />);
      await screen.findByRole('heading', { level: 1, name: movie.title });
      if (source === 'card portrait') {
        await user.click(cards().getByRole('img', { name: 'Director One' }));
      } else {
        const link =
          source === 'cast member'
            ? cards().getByRole('link', { name: 'Director One' })
            : crewGroup('Directors').getByRole('link', {
                name: 'Director One',
              });
        link.focus();
        await user.keyboard('{Enter}');
      }
      await screen.findByRole('heading', { level: 1, name: person.name });
      expect(router.state.location.pathname).toBe('/person/11');
      expect(router.state.location.search).toBe('');
      expect(screen.getByRole('main')).toHaveFocus();
      await act(async () => {
        await router.navigate(-1);
      });
      await screen.findByRole('heading', { level: 1, name: movie.title });
      expect(router.state.location.search).toBe(
        '?sorting=title&personSort=oldest'
      );
      await act(async () => {
        await router.navigate(1);
      });
      await screen.findByRole('heading', { level: 1, name: person.name });
      await user.click(screen.getByRole('link', { name: movie.title }));
      await screen.findByRole('heading', { level: 1, name: movie.title });
      expect(router.state.location.pathname).toBe('/movie/10');
      expect(router.state.location.search).toBe('');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/api/v1/persons/11',
        { signal: expect.any(AbortSignal) }
      );
    } finally {
      vi.unstubAllGlobals();
    }
  }
);

const extended: MovieDetails = {
  ...structured,
  writers: [
    { id: 11, name: 'Director One', roles: ['Screenplay', 'Story'] },
    { id: 31, name: 'Writer Two', roles: ['Writer'] },
    { name: 'Unknown Writer', roles: ['Story'] },
  ],
  producers: [
    { id: 31, name: 'Writer Two', roles: ['Producer'] },
    { id: 41, name: 'Producer Two', roles: ['Producer'] },
    { name: 'Unknown Producer', roles: ['Producer'] },
  ],
};

test.each([
  ['Writers', 'Writer Two', '/person/31'],
  ['Producers', 'Producer Two', '/person/41'],
] as const)(
  'navigates by keyboard from the %s Crew link',
  async (groupName, name, path) => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/', element: <DetailsLowerContent movieData={extended} /> },
      { path: '/person/:id', element: <h1>Person destination</h1> },
    ]);
    render(<RouterProvider router={router} />);
    crewGroup(groupName).getByRole('link', { name }).focus();
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Person destination' })
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(path);
  }
);
