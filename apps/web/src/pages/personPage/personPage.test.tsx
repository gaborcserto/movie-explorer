import {
  act,
  fireEvent,
  render,
  screen,
  within,
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
    'http://localhost:4000/api/v1/persons/42?include=combinedFilmography',
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
  expect(screen.getByRole('main')).toContainElement(
    screen.getByRole('heading', { name: person.name })
  );
  expect(screen.getByRole('main')).toContainElement(
    screen.getByRole('heading', { name: 'Biography' })
  );
  expect(screen.getByRole('main')).toContainElement(
    screen.getByRole('heading', { name: 'Filmography' })
  );
  await waitFor(() =>
    expect(document.title).toBe(`${person.name} | Movie Explorer`)
  );

  expect(screen.getAllByRole('link', { name: 'Movie Explorer' })).toHaveLength(
    2
  );
  expect(
    screen
      .getByRole('button', { name: 'Search movies and people' })
      .closest('main')
  ).toBeNull();
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
    { signal: expect.any(AbortSignal) }
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
    screen.queryByRole('button', {
      name: `Open portrait gallery for ${person.name}`,
    })
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
    name: `Open portrait gallery for ${person.name}`,
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

test('does not expose a gallery control without a primary portrait even when optional photos exist', async () => {
  fetchMock.mockResolvedValue(
    response({
      ...person,
      profileUrl: undefined,
      profileSrcSet: undefined,
      profilePhotos: [
        { thumbnailUrl: '/other.jpg', fullUrl: '/other-original.jpg' },
      ],
    })
  );
  renderPage();
  await screen.findByRole('heading', { name: person.name });
  expect(
    screen.getByRole('img', { name: `Portrait of ${person.name}` }).tagName
  ).toBe('DIV');
  expect(
    screen.queryByRole('button', {
      name: `Open portrait gallery for ${person.name}`,
    })
  ).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test.each(['{Enter}', ' '])(
  'opens a single portrait with %s and closes with focus restoration',
  async (key) => {
    const user = userEvent.setup();
    renderPage();
    const portrait = await screen.findByRole('img', {
      name: `Portrait of ${person.name}`,
    });
    const trigger = screen.getByRole('button', {
      name: `Open portrait gallery for ${person.name}`,
    });
    expect(trigger).toBeDisabled();
    fireEvent.load(portrait);
    trigger.focus();
    await user.keyboard(key);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1 / 1')).toBeVisible();
    expect(
      within(dialog).queryByRole('button', { name: 'Next photo' })
    ).toBeNull();
    expect(
      within(dialog).queryByRole('button', { name: 'Previous photo' })
    ).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(
      within(dialog).getByRole('button', { name: 'Close photo viewer' })
    );
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  }
);

test('opens the primary portrait first, deduplicates profiles and navigates with loading and error feedback', async () => {
  const user = userEvent.setup();
  const primary = {
    thumbnailUrl: person.profileUrl,
    fullUrl: '/portrait-original.jpg',
    alt: `Portrait of ${person.name}`,
  };
  const second = {
    thumbnailUrl: '/second.jpg',
    fullUrl: '/second-original.jpg',
    alt: `Portrait of ${person.name}`,
  };
  fetchMock.mockResolvedValue(
    response({ ...person, profilePhotos: [second, primary, second] })
  );
  const router = renderPage();
  const portrait = within(
    await screen.findByRole('button', {
      name: `Open portrait gallery for ${person.name}`,
    })
  ).getByRole('img');
  expect(
    document.querySelector('img[src="/portrait-original.jpg"]')
  ).toBeNull();
  fireEvent.load(portrait);
  const trigger = screen.getByRole('button', {
    name: `Open portrait gallery for ${person.name}`,
  });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('1 / 2')).toBeVisible();
  const firstImage = dialog.querySelector('img');
  expect(firstImage).toHaveAttribute('src', '/portrait-original.jpg');
  expect(within(dialog).getByRole('status')).toHaveTextContent('Loading photo');
  if (!firstImage) {
    throw new Error('Missing primary image');
  }

  fireEvent.load(firstImage);
  expect(within(dialog).queryByRole('status')).toBeNull();
  await user.click(within(dialog).getByRole('button', { name: 'Next photo' }));
  expect(firstImage).not.toHaveAttribute('src');
  const nextImage = dialog.querySelector('img');
  expect(nextImage).toHaveAttribute('src', second.fullUrl);
  if (!nextImage) {
    throw new Error('Missing next image');
  }

  fireEvent.error(nextImage);
  expect(within(dialog).getByRole('alert')).toHaveTextContent(
    'Unable to load photo'
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'Previous photo' })
  );
  expect(dialog.querySelector('img')).toHaveAttribute('src', primary.fullUrl);
  await user.keyboard('{ArrowLeft}{ArrowRight}{Escape}');
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await act(async () => router.navigate('/person/43'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).not.toBe('hidden');
});

test.each([
  undefined,
  [],
  null,
  { profiles: [] },
  [{ fullUrl: 3 }],
  [{ thumbnailUrl: '', fullUrl: '' }],
])(
  'keeps the primary portrait usable with missing or malformed optional photos: %j',
  async (profilePhotos) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(response({ ...person, profilePhotos }));
    renderPage();
    const portrait = await screen.findByRole('img', {
      name: `Portrait of ${person.name}`,
    });
    fireEvent.load(portrait);
    await user.click(
      screen.getByRole('button', {
        name: `Open portrait gallery for ${person.name}`,
      })
    );
    expect(within(screen.getByRole('dialog')).getByText('1 / 1')).toBeVisible();
    await user.keyboard('{Escape}');
  }
);

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
  const loadingHero = screen.getByRole('status').closest('.person-hero');
  expect(loadingHero).toContainElement(
    screen.getByRole('heading', { level: 1, name: 'Person details' })
  );
  expect(
    loadingHero?.querySelector('.person-profile__portrait')
  ).toHaveAttribute('aria-hidden', 'true');
  expect(
    loadingHero?.querySelector('.person-profile__biography-placeholder')
  ).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('img')).toBeNull();
  const signal = fetchMock.mock.calls[0][1]?.signal;
  expect(signal?.aborted).toBe(false);
  unmount();
  expect(signal?.aborted).toBe(true);
});

test.each([
  'nope',
  '0',
  '-1',
  '1.5',
  '1e2',
  '0x10',
  ' 42',
  '42 ',
  '9007199254740992',
])('rejects invalid ID %s without a request', (id) => {
  renderPage(`/person/${id}`);
  expect(
    screen.getByRole('heading', { level: 1, name: 'Invalid person ID' })
  ).toBeVisible();
  expect(screen.getByRole('alert')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Back to Search' })).toHaveAttribute(
    'href',
    '/search'
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test('handles HTTP 404 with a route back to browsing', async () => {
  fetchMock.mockResolvedValue(response(undefined, 404));
  renderPage();
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Person not found' })
  ).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'We could not find that person.'
  );
  expect(screen.getByRole('link', { name: 'Back to Search' })).toHaveAttribute(
    'href',
    '/search'
  );
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
});

test.each(['network', 'HTTP'])(
  'recovers from a %s failure through Retry and returns focus to main on success',
  async (failure) => {
    const user = userEvent.setup();
    if (failure === 'network') {
      fetchMock.mockRejectedValueOnce(new TypeError('Network failed'));
    } else {
      fetchMock.mockResolvedValueOnce(response(undefined, 502));
    }

    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      failure === 'network'
        ? 'Connection problem'
        : 'Service temporarily unavailable'
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: person.name })
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('main')).toHaveFocus();
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
      if (result === 'success') {
        pending.resolve(response());
      } else {
        pending.reject(new TypeError('Old request failed'));
      }
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'New person'
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.title).toBe('New person | Movie Explorer');
    expect(screen.getByRole('main')).toHaveFocus();
  }
);

test('Back/Forward navigation loads the correct person and resets biography expansion', async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation(async (url) =>
    response({
      ...person,
      id: new URL(String(url)).pathname.endsWith('/43') ? 43 : 42,
      name: new URL(String(url)).pathname.endsWith('/43')
        ? 'Second person'
        : person.name,
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

test('sets a loading title and preserves the destination title after late data', async () => {
  document.title = 'Movie Explorer';
  const pending = deferredResponse();
  fetchMock.mockReturnValueOnce(pending.promise);
  const router = renderPage();
  expect(document.title).toBe('Loading person | Movie Explorer');
  expect(screen.getByRole('main')).toHaveFocus();
  await act(async () => {
    await router.navigate('/unknown-route');
  });
  await waitFor(() =>
    expect(document.title).toBe('Page not found | Movie Explorer')
  );
  await act(async () => {
    pending.resolve(response());
  });
  expect(document.title).toBe('Page not found | Movie Explorer');
});

test.each([
  [404, 'Person not found'],
  [502, 'Service temporarily unavailable'],
])(
  'uses a meaningful title and focused main for HTTP %s',
  async (status, title) => {
    fetchMock.mockResolvedValueOnce(response(undefined, status));
    renderPage();
    await screen.findByRole('alert');
    await waitFor(() =>
      expect(document.title).toBe(`${title} | Movie Explorer`)
    );
    expect(screen.getByRole('main')).toHaveFocus();
  }
);

test('biography and filmography interactions retain focus and the person title', async () => {
  fetchMock.mockResolvedValueOnce(
    response({ ...person, biography: 'Biography. '.repeat(100) })
  );
  renderPage();
  const user = userEvent.setup();
  const expand = await screen.findByRole('button', { name: 'Show More' });
  await user.click(expand);
  expect(expand).toHaveFocus();
  const sort = screen.getByRole('combobox', { name: 'Sort filmography' });
  await user.selectOptions(sort, 'title');
  expect(sort).toHaveFocus();
  expect(document.title).toBe(`${person.name} | Movie Explorer`);
});

test('person photos reveal progressively, retain full lightbox navigation and reset on route changes', async () => {
  const profilePhotos = Array.from({ length: 18 }, (_, index) => ({
    thumbnailUrl: `/profile-${index}.jpg`,
    fullUrl: `/full-profile-${index}.jpg`,
    alt: `Portrait ${index + 1} of ${person.name}`,
  }));
  fetchMock.mockResolvedValueOnce(response({ ...person, profilePhotos }));
  fetchMock.mockResolvedValueOnce(
    response({ ...person, id: 43, name: 'Next person' })
  );
  const router = renderPage();
  const user = userEvent.setup();
  const more = await screen.findByRole('button', {
    name: `Show more photos for ${person.name}`,
  });

  expect(
    screen.getAllByRole('button', {
      name: new RegExp(`View ${person.name} photo`),
    })
  ).toHaveLength(10);

  await user.click(more);
  expect(
    screen.getAllByRole('button', {
      name: new RegExp(`View ${person.name} photo`),
    })
  ).toHaveLength(18);

  await user.click(
    screen.getByRole('button', { name: `View ${person.name} photo 6` })
  );
  expect(within(screen.getByRole('dialog')).getByText('6 / 18')).toBeVisible();
  await user.keyboard('{Escape}');

  expect(
    screen.getByRole('button', { name: `View ${person.name} photo 6` })
  ).toHaveFocus();

  await user.click(
    screen.getByRole('button', { name: `View ${person.name} photo 6` })
  );
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
    'src',
    '/full-profile-6.jpg'
  );

  await act(async () => router.navigate('/person/43'));
  await screen.findByRole('heading', { name: 'Next person' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('18 photos available')).toBeNull();
  expect(document.body.style.overflow).not.toBe('hidden');
});
