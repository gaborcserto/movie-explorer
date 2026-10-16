import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  return within(screen.getByRole('region', { name: 'Cast & Crew' }));
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
    expect(cards().getAllByRole('article')).toHaveLength(2);
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

test('places cast before directors and merges actor/director roles and distinct characters by ID', () => {
  const source = JSON.stringify(structured);
  renderCredits({
    ...structured,
    directors: [
      ...(structured.directors ?? []),
      { id: 11, name: 'Director One' },
    ],
  });
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
    'Director Two',
    'Unknown Director',
  ]);
  expect(cards().getByText('Director · Narrator')).toBeVisible();
  expect(cards().getByText('Hero · Villain')).toBeVisible();
  expect(cards().getAllByText('Director', { selector: 'p' })).toHaveLength(2);
  expect(cards().getAllByRole('link', { name: 'Director One' })).toHaveLength(
    1
  );
  expect(JSON.stringify(structured)).toBe(source);
});

test('does not merge identical names belonging to different IDs or unidentified people', () => {
  renderCredits({
    ...movie,
    cast: ['Same', 'Same', 'Same'],
    directors: [{ id: 1, name: 'Same' }, { name: 'Same' }],
    castMembers: [{ id: 2, name: 'Same' }, { name: 'Same' }, { name: 'Same' }],
  });
  expect(cards().getAllByRole('article')).toHaveLength(5);
  expect(
    cards()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/person/2', '/person/1']);
});

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

test('deduplicates cast before the six-person limit, collects late character roles, and retains every director', () => {
  renderCredits({
    ...movie,
    directors: Array.from({ length: 8 }, (_, index) => ({
      id: 100 + index,
      name: `Director ${index}`,
    })),
    castMembers: [
      { id: 1, name: 'First', character: 'Hero' },
      { id: 1, name: 'First', character: 'Hero' },
      ...Array.from({ length: 6 }, (_, index) => ({
        id: 2 + index,
        name: `Actor ${index}`,
      })),
      { id: 1, name: 'First', character: 'Narrator' },
      { id: 100, name: 'Director 0', character: 'Cameo' },
    ],
  });
  expect(cards().getAllByRole('article')).toHaveLength(14);
  expect(
    cards()
      .getAllByRole('heading', { level: 3 })
      .slice(6)
      .map((heading) => heading.textContent)
  ).toEqual(Array.from({ length: 8 }, (_, index) => `Director ${index}`));
  expect(cards().getByText('Hero · Narrator')).toBeVisible();
  expect(cards().getByText('Director · Cameo')).toBeVisible();
  expect(cards().getByRole('heading', { name: 'Actor 4' })).toBeVisible();
  expect(cards().queryByRole('heading', { name: 'Actor 5' })).toBeNull();
});

test('uses one keyboard-accessible link for the complete portrait/name card', async () => {
  const user = userEvent.setup();
  renderCredits();
  const link = cards().getByRole('link', { name: 'Director One' });
  expect(
    within(link).getByRole('img', { name: 'Director One' })
  ).toHaveAttribute('src', '/director.jpg');
  expect(
    within(link).getByRole('heading', { name: 'Director One' })
  ).toBeVisible();
  expect(within(link).getByText('Director · Narrator')).toBeVisible();
  expect(link).toHaveClass('cast-member__link');
  expect(link).toHaveAttribute('href', '/person/11');
  expect(link).not.toHaveAttribute('target');
  link.focus();
  expect(link).toHaveFocus();
  await user.tab();
  expect(cards().getAllByRole('link', { name: 'Same Name' })[0]).toHaveFocus();
  expect(within(link).queryAllByRole('link')).toHaveLength(0);
});

test('keeps responsive director images lazy and preserves missing and failed portrait placeholders', () => {
  renderCredits();
  const image = cards().getByRole('img', { name: 'Director One' });
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(image).toHaveAttribute(
    'srcset',
    '/director-small.jpg 1x, /director-large.jpg 2x'
  );
  expect(cards().getByRole('img', { name: 'Director Two' }).tagName).toBe(
    'DIV'
  );
  fireEvent.error(image);
  expect(cards().getByRole('img', { name: 'Director One' }).tagName).toBe(
    'DIV'
  );
  expect(cards().getByRole('link', { name: 'Director One' })).toHaveAttribute(
    'href',
    '/person/11'
  );
});

test('can use the cast portrait when an overlapping director has no portrait', () => {
  renderCredits({
    ...movie,
    directors: [{ id: 1, name: 'Director Actor' }],
    castMembers: [
      {
        id: 1,
        name: 'Director Actor',
        profileUrl: '/actor.jpg',
        character: 'Hero',
      },
    ],
  });
  expect(cards().getByRole('img', { name: 'Director Actor' })).toHaveAttribute(
    'src',
    '/actor.jpg'
  );
  expect(cards().getAllByRole('article')).toHaveLength(1);
});

test('handles director-only credits and empty credits without inventing metadata', () => {
  const { unmount } = renderCredits({
    ...movie,
    director: undefined,
    directors: [{ id: 11, name: 'Only Director' }],
    cast: [],
  });
  expect(summary().queryByText('Cast')).toBeNull();
  expect(cards().getByText('Director', { selector: 'p' })).toBeVisible();
  unmount();
  renderCredits({ ...movie, director: undefined, directors: [], cast: [] });
  expect(screen.queryByRole('heading', { name: 'Credits' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Cast & Crew' })).toBeNull();
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

test('orders all credit categories, links multiple writers and producers, and combines card roles by ID', () => {
  renderCredits(extended);
  expect(
    summary()
      .getAllByRole('term')
      .map((term) => term.textContent)
  ).toEqual(['Cast', 'Director', 'Writer', 'Producer']);
  expect(summary().getAllByRole('definition')[2]).toHaveTextContent(
    'Director One, Writer Two, Unknown Writer'
  );
  expect(summary().getAllByRole('definition')[3]).toHaveTextContent(
    'Writer Two, Producer Two, Unknown Producer'
  );
  expect(
    summary()
      .getAllByRole('link', { name: 'Writer Two' })
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/person/31', '/person/31']);
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
    'Director Two',
    'Unknown Director',
    'Writer Two',
    'Unknown Writer',
    'Producer Two',
    'Unknown Producer',
  ]);
  expect(
    cards().getByText('Director \u00b7 Screenplay \u00b7 Story \u00b7 Narrator')
  ).toBeVisible();
  expect(cards().getByText('Writer \u00b7 Producer')).toBeVisible();
  expect(cards().getAllByRole('link', { name: 'Writer Two' })).toHaveLength(1);
  expect(cards().getByRole('img', { name: 'Unknown Writer' }).tagName).toBe(
    'DIV'
  );
});

test.each([undefined, 0, -1, 1.5, NaN, Infinity])(
  'does not infer writer or producer identities for ID %s',
  (id) => {
    renderCredits({
      ...movie,
      director: undefined,
      writers: [{ id, name: 'Same', roles: ['Story'] }],
      producers: [{ id, name: 'Same', roles: ['Producer'] }],
    });
    expect(
      summary()
        .getAllByRole('term')
        .map((term) => term.textContent)
    ).toEqual(['Writer', 'Producer']);
    expect(summary().queryByRole('link')).toBeNull();
    expect(cards().getAllByRole('article')).toHaveLength(2);
    expect(cards().queryByRole('link')).toBeNull();
    expect(cards().getByText('Story')).toBeVisible();
    expect(cards().getByText('Producer')).toBeVisible();
  }
);

test('preserves every writer and producer outside the six distinct cast limit and keeps names separate', () => {
  renderCredits({
    ...movie,
    director: undefined,
    writers: Array.from({ length: 8 }, (_, index) => ({
      id: 100 + index,
      name: 'Same',
      roles: ['Screenplay'],
    })),
    producers: Array.from({ length: 8 }, (_, index) => ({
      id: 200 + index,
      name: 'Same',
      roles: ['Producer'],
    })),
    castMembers: [
      { id: 1, name: 'First', character: 'Hero' },
      { id: 1, name: 'First', character: 'Narrator' },
      ...Array.from({ length: 6 }, (_, index) => ({
        id: 2 + index,
        name: `Cast ${index}`,
      })),
    ],
  });
  expect(cards().getAllByRole('article')).toHaveLength(22);
  expect(cards().getAllByRole('heading', { level: 3 })).toHaveLength(22);
  expect(cards().getAllByRole('heading', { name: 'Same' })).toHaveLength(16);
  expect(cards().getByText('Hero \u00b7 Narrator')).toBeVisible();
  expect(cards().queryByRole('heading', { name: 'Cast 5' })).toBeNull();
});

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

test('uses the first applicable category for shared identities while preserving crew beyond the cast limit', () => {
  renderCredits({
    ...movie,
    director: undefined,
    castMembers: [
      { id: 1, name: 'Shared', character: 'Hero' },
      { id: 1, name: 'Shared', character: 'Narrator' },
      ...Array.from({ length: 5 }, (_, index) => ({
        id: index + 2,
        name: `Actor ${index}`,
      })),
      { id: 7, name: 'Late Cast Director', character: 'Cameo' },
      { id: 11, name: 'Excluded Actor' },
    ],
    directors: [
      { id: 7, name: 'Late Cast Director' },
      { id: 1, name: 'Shared' },
      { id: 8, name: 'Director Writer' },
    ],
    writers: [
      { id: 1, name: 'Shared', roles: ['Screenplay'] },
      { id: 8, name: 'Director Writer', roles: ['Story'] },
      { id: 9, name: 'Writer Producer', roles: ['Writer'] },
    ],
    producers: [
      { id: 1, name: 'Shared', roles: ['Producer'] },
      { id: 9, name: 'Writer Producer', roles: ['Producer'] },
      { id: 10, name: 'Producer', roles: ['Producer'] },
    ],
  });
  expect(
    cards()
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(Array.from({ length: 10 }, (_, index) => `/person/${index + 1}`));
  expect(cards().queryByRole('heading', { name: 'Excluded Actor' })).toBeNull();
  const shared = within(cards().getByRole('link', { name: 'Shared' }));
  ['Director', 'Screenplay', 'Producer', 'Hero', 'Narrator'].forEach((role) => {
    expect(shared.getByRole('paragraph')).toHaveTextContent(role);
  });
  expect(
    within(cards().getByRole('link', { name: 'Late Cast Director' })).getByRole(
      'paragraph'
    )
  ).toHaveTextContent('Cameo');
});
