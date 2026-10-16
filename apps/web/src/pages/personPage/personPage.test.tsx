import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { PersonDetails } from '@movie-explorer/contracts';
import App from '../../App';
import { getPerson } from '../../util/apiUtils';

const person: PersonDetails = {
  id: 42,
  name: 'Zoë 李 — García',
  knownForDepartment: 'Directing',
  birthday: '1970-01-01',
  deathDate: '2020-12-31',
  placeOfBirth: 'Budapest, Hungary',
  biography: 'First paragraph.\n\nSecond paragraph.\nAnother line.',
  profileUrl: '/portrait-500.jpg',
  profileSrcSet:
    '/portrait-185.jpg 1x, /portrait-632.jpg 2x, /portrait-original.jpg 3x',
  filmography: [
    {
      id: 10,
      title: 'A movie',
      posterUrl: '/movie.jpg',
      genres: [],
      crewCredits: [{ job: 'Director' }],
    },
  ],
};

function response(body: unknown = person, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const fetchMock = vi.fn<typeof fetch>();

function renderPage(path = '/person/42') {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(response());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('direct person navigation loads the complete contract through the API without search', async () => {
  renderPage();
  expect(
    await screen.findByRole('heading', { level: 1, name: person.name })
  ).toBeVisible();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/persons/42',
    { signal: expect.any(AbortSignal) }
  );
  expect(screen.getByText('Directing')).toBeVisible();
  const hero = screen
    .getByRole('heading', { name: person.name })
    .closest('.person-hero');
  expect(hero).not.toBeNull();
  expect(hero?.querySelector('.person-hero__posters')).toHaveAttribute(
    'aria-hidden',
    'true'
  );
  expect(hero?.querySelectorAll('.person-hero__posters img')).toHaveLength(1);
  expect(screen.getByText('Budapest, Hungary')).toBeVisible();
  expect(screen.getByText('1970-01-01')).toHaveAttribute(
    'datetime',
    '1970-01-01'
  );
  expect(screen.getByText('Age').nextElementSibling).toHaveTextContent('50');
  expect(screen.getByText('2020-12-31')).toHaveAttribute(
    'datetime',
    '2020-12-31'
  );
  expect(document.getElementById('person-biography')?.textContent).toBe(
    person.biography
  );
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.getAllByRole('link', { name: 'Movie Explorer' })).toHaveLength(
    2
  );
  expect(
    screen
      .getByRole('button', { name: 'Search movies' })
      .closest('.person-hero')
  ).not.toBeNull();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(
    screen.queryByPlaceholderText('What do you want to watch?')
  ).toBeNull();
  expect(screen.getByRole('link', { name: 'A movie' })).toHaveAttribute(
    'href',
    '/movie/10'
  );
  expect(screen.queryByRole('button', { name: 'Show More' })).toBeNull();
});

test('API helper retains filmography and forwards the cancellation signal', async () => {
  const controller = new AbortController();
  await expect(getPerson(42, controller.signal)).resolves.toEqual(person);
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/persons/42',
    { signal: controller.signal }
  );
});

test('omits optional metadata and uses the missing portrait and biography placeholders', async () => {
  fetchMock.mockResolvedValue(
    response({ id: 42, name: 'Only a name', filmography: [] })
  );
  renderPage();
  await screen.findByRole('heading', { name: 'Only a name' });
  ['Known for', 'Birthday', 'Death date', 'Place of birth', 'Actor'].forEach(
    (label) => {
      expect(screen.queryByText(label)).toBeNull();
    }
  );
  expect(screen.getByText('Biography unavailable.')).toBeVisible();
  expect(
    screen.getByRole('img', { name: 'Portrait of Only a name' }).tagName
  ).toBe('DIV');
  expect(document.querySelector('.person-hero__posters')).toBeNull();
});

test('uses distinct available filmography posters as decorative hero tiles', async () => {
  fetchMock.mockResolvedValue(
    response({
      ...person,
      filmography: [
        ...person.filmography,
        { ...person.filmography[0], id: 11 },
        { ...person.filmography[0], id: 12, posterUrl: '' },
        { ...person.filmography[0], id: 13, posterUrl: '/other-movie.jpg' },
      ],
    })
  );
  renderPage();
  await screen.findByRole('heading', { name: person.name });
  const backdrop = document.querySelector('.person-hero__posters');
  expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  expect(
    [...(backdrop?.querySelectorAll('img') ?? [])].map((image) => image.src)
  ).toEqual([
    new URL('/movie.jpg', window.location.href).href,
    new URL('/other-movie.jpg', window.location.href).href,
  ]);
  expect(backdrop?.querySelector('a, button')).toBeNull();
});

test.each(['', '  \n  '])(
  'handles an empty biography (%j)',
  async (biography) => {
    fetchMock.mockResolvedValue(response({ ...person, biography }));
    renderPage();
    expect(await screen.findByText('Biography unavailable.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Show More' })).toBeNull();
  }
);

test('uses responsive portrait candidates and failed-image fallback', async () => {
  renderPage();
  const portrait = await screen.findByRole('img', {
    name: `Portrait of ${person.name}`,
  });
  expect(portrait).toHaveAttribute('src', person.profileUrl);
  expect(portrait).toHaveAttribute(
    'srcset',
    '/portrait-185.jpg 1x, /portrait-632.jpg 2x'
  );
  expect(portrait).toHaveAttribute(
    'sizes',
    '(max-width: 767.98px) min(320px, calc(100vw - 52px)), 320px'
  );
  expect(portrait).toHaveAttribute('loading', 'eager');
  fireEvent.error(portrait);
  expect(
    screen.getByRole('img', { name: `Portrait of ${person.name}` }).tagName
  ).toBe('DIV');
  expect(
    screen.queryByRole('button', { name: `Portrait of ${person.name}` })
  ).toBeNull();
});

test('opens the full-resolution portrait from the keyboard and restores focus', async () => {
  const user = userEvent.setup();
  renderPage();
  const portrait = await screen.findByRole('img', {
    name: `Portrait of ${person.name}`,
  });
  fireEvent.load(portrait);

  const trigger = screen.getByRole('button', {
    name: `Portrait of ${person.name}`,
  });
  trigger.focus();
  await user.keyboard('{Enter}');

  const dialog = screen.getByRole('dialog', {
    name: `${person.name} photo viewer`,
  });
  expect(dialog.querySelector('img')).toHaveAttribute(
    'src',
    '/portrait-original.jpg'
  );
  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
});

test('renders biography as plain text and supports keyboard expansion and collapse', async () => {
  const user = userEvent.setup();
  const biography = `${'A complete word. '.repeat(70)}\n\n<script>plain text</script>`;
  fetchMock.mockResolvedValue(response({ ...person, biography }));
  renderPage();
  const toggle = await screen.findByRole('button', { name: 'Show More' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAttribute('aria-controls', 'person-biography');
  expect(document.getElementById('person-biography')?.textContent).toMatch(
    /word\.…$/
  );
  toggle.focus();
  await user.keyboard('{Enter}');
  expect(toggle).toHaveAccessibleName('Show Less');
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById('person-biography')?.textContent).toBe(
    biography
  );
  expect(document.querySelector('main script')).toBeNull();
  await user.keyboard(' ');
  expect(toggle).toHaveAccessibleName('Show More');
  expect(toggle).toHaveFocus();
});

test('announces loading and cancels requests on unmount', () => {
  fetchMock.mockReturnValue(new Promise(() => {}));
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: ['/person/42'],
  });
  const { unmount } = render(<RouterProvider router={router} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  const signal = fetchMock.mock.calls[0][1]?.signal;
  expect(signal?.aborted).toBe(false);
  unmount();
  expect(signal?.aborted).toBe(true);
});

test.each(['nope', '0', '-1', '1.5', '1e2', '9007199254740992'])(
  'rejects invalid ID %s without a request',
  (id) => {
    renderPage(`/person/${id}`);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Invalid person ID' })
    ).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse movies' })).toHaveAttribute(
      'href',
      '/search'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  }
);

test('handles HTTP 404 with a route back to browsing', async () => {
  fetchMock.mockResolvedValue(response(undefined, 404));
  renderPage();
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Person not found' })
  ).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'We could not find that person.'
  );
  expect(screen.getByRole('link', { name: 'Browse movies' })).toHaveAttribute(
    'href',
    '/search'
  );
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
});

test.each(['network', 'HTTP'])(
  'recovers from a %s failure through Retry without refocusing main',
  async (failure) => {
    const user = userEvent.setup();
    if (failure === 'network')
      fetchMock.mockRejectedValueOnce(new TypeError('Network failed'));
    else fetchMock.mockResolvedValueOnce(response(undefined, 502));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load person'
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: person.name })
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('main')).not.toHaveFocus();
  }
);

test.each(['success', 'failure'])(
  'ignores stale %s after rapid navigation',
  async (result) => {
    const pending = deferredResponse();
    fetchMock.mockReturnValueOnce(pending.promise);
    fetchMock.mockResolvedValueOnce(
      response({ ...person, id: 43, name: 'New person' })
    );
    const router = renderPage();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    await act(async () => {
      await router.navigate('/person/43');
    });
    expect(
      await screen.findByRole('heading', { name: 'New person' })
    ).toBeVisible();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      if (result === 'success') pending.resolve(response());
      else pending.reject(new TypeError('Old request failed'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'New person'
    );
    expect(screen.queryByRole('alert')).toBeNull();
  }
);

test('Back/Forward navigation loads the correct person and resets biography expansion', async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation(async (url) =>
    response({
      ...person,
      id: String(url).endsWith('/43') ? 43 : 42,
      name: String(url).endsWith('/43') ? 'Second person' : person.name,
      biography: 'Long biography. '.repeat(100),
    })
  );
  const router = renderPage();
  await user.click(await screen.findByRole('button', { name: 'Show More' }));
  await act(async () => {
    await router.navigate('/person/43');
  });
  await screen.findByRole('heading', { name: 'Second person' });
  expect(screen.getByRole('button', { name: 'Show More' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  await act(async () => {
    await router.navigate(-1);
  });
  await screen.findByRole('heading', { name: person.name });
  expect(screen.getByRole('button', { name: 'Show More' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  await act(async () => {
    await router.navigate(1);
  });
  await waitFor(() =>
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Second person'
    )
  );
});
