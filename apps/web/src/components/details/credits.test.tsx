import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import type { MovieDetails, PersonDetails } from '@movie-explorer/contracts';
import DetailsContent, { DetailsLowerContent } from './detailsContent';
import App from '../../App';

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

function summary() {
  const section = screen
    .getByRole('heading', { name: 'Credits' })
    .closest('section');
  if (!section) throw new Error('Missing Credits section');
  return within(section);
}

function cards() {
  return within(screen.getByRole('region', { name: 'Cast' }));
}

test('links structured director and cast names in order with the existing labels and separators', () => {
  renderCredits();
  expect(summary().getByText('Director', { selector: 'dt' })).toBeVisible();
  expect(summary().getByText('Cast', { selector: 'dt' })).toBeVisible();
  expect(summary().getAllByRole('definition')[1]).toHaveTextContent(
    'Director One, Director Two, Unknown Director'
  );
  expect(summary().getAllByRole('definition')[0]).toHaveTextContent(
    'Actor One · Director One · Same Name · Same Name · Unknown Actor'
  );
  expect(
    summary()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual([
    '/person/21',
    '/person/11',
    '/person/22',
    '/person/23',
    '/person/11',
    '/person/12',
  ]);
  expect(summary().queryByText('Legacy Director')).toBeNull();
});

test.each([undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'keeps invalid or missing person ID %s as plain text',
  (id) => {
    renderCredits({
      ...movie,
      directors: [{ id, name: 'Unlinked Director' }],
      castMembers: [{ id, name: 'Unlinked Actor' }],
    });
    expect(summary().getByText('Unlinked Director')).toBeVisible();
    expect(summary().getByText('Unlinked Actor')).toBeVisible();
    expect(summary().queryByRole('link')).toBeNull();
    expect(cards().getAllByRole('article')).toHaveLength(1);
    expect(cards().queryByRole('link')).toBeNull();
  }
);

test.each([undefined, []])(
  'preserves plain legacy credits when structured data is %j',
  (empty) => {
    renderCredits({
      ...movie,
      director: 'Director A, Director B',
      directors: empty,
      cast: [' Actor A ', 'Actor B'],
      castMembers: empty,
    });
    expect(summary().getByText('Director A, Director B')).toBeVisible();
    expect(summary().getAllByRole('definition')[0]).toHaveTextContent(
      'Actor A · Actor B'
    );
    expect(summary().queryByRole('link')).toBeNull();
    expect(
      cards()
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Actor A', 'Actor B']);
    expect(cards().queryByRole('link')).toBeNull();
  }
);

test('preserves unmatched legacy cast names in partial structured responses without inferring IDs', () => {
  renderCredits({
    ...movie,
    cast: ['Same', 'Same', 'Legacy Only'],
    castMembers: [{ id: 1, name: 'Same' }],
  });
  expect(summary().getAllByRole('definition')[0]).toHaveTextContent(
    'Same · Same · Legacy Only'
  );
  expect(summary().getAllByRole('link')).toHaveLength(1);
  expect(cards().getAllByRole('article')).toHaveLength(3);
  expect(
    cards()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/person/1']);
});

test.each(['summary director', 'summary cast', 'card name', 'card portrait'])(
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
      if (source === 'card portrait')
        await user.click(cards().getByRole('img', { name: 'Director One' }));
      else {
        const link =
          source === 'card name'
            ? cards().getByRole('link', { name: 'Director One' })
            : summary().getAllByRole('link', { name: 'Director One' })[
                source === 'summary cast' ? 0 : 1
              ];
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

test.each(['Writer Two', 'Producer Two'])(
  'navigates by keyboard from the %s summary link',
  async (name) => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/', element: <DetailsContent movieData={extended} /> },
      { path: '/person/:id', element: <h1>Person destination</h1> },
    ]);
    render(<RouterProvider router={router} />);
    summary().getAllByRole('link', { name })[0].focus();
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: 'Person destination' })
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(
      name === 'Writer Two' ? '/person/31' : '/person/41'
    );
  }
);
