import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Details from '../details';
import PersonPage from '../../pages/personPage/personPage';
import { getMovie, getPerson, getSearchSuggestions } from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async () => ({
  ...(await vi.importActual<typeof import('../../util/apiUtils')>(
    '../../util/apiUtils'
  )),
  getMovie: vi.fn(),
  getPerson: vi.fn(),
  getSearchSuggestions: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMovie).mockResolvedValue({
    id: 1,
    title: 'Test movie',
    posterUrl: '',
    genres: [],
    cast: [],
  });
  vi.mocked(getPerson).mockResolvedValue({
    id: 1,
    name: 'Test person',
    filmography: [],
  });
});

describe.each([
  ['/movie/1?photo=2&video=3&filter=Drama', 'Test movie'],
  [
    '/person/1?personSort=title&personView=crew&personRole=job%3ADirector',
    'Test person',
  ],
])('shared header on %s', (path, title) => {
  async function setup() {
    const router = createMemoryRouter(
      [
        { path: '/movie/:movieId', element: <Details /> },
        { path: '/person/:id', element: <PersonPage /> },
        { path: '/search/:searchQuery', element: <h1>Search results</h1> },
      ],
      { initialEntries: [path] }
    );
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: title, level: 1 });

    return { router, user: userEvent.setup() };
  }

  test('starts collapsed, opens from the keyboard, focuses and closes with Escape', async () => {
    const { user } = await setup();
    const trigger = screen.getByRole('button', {
      name: 'Search movies, series and people',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Search movies, series and people' })
    ).toBeNull();
    trigger.focus();
    await user.keyboard('{Enter}');
    const input = screen.getByRole('combobox', {
      name: 'Search movies, series and people',
    });
    expect(input).toHaveAttribute(
      'placeholder',
      'Search movies, series and people...'
    );
    expect(input).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', input.id);
    expect(trigger.querySelector('svg')).toBeVisible();
    expect(trigger).toBeVisible();
    await user.type(input, 'Spider-Man');
    expect(input).toHaveValue('Spider-Man');
    await user.clear(input);
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute(
      'placeholder',
      'Search movies, series and people...'
    );
    trigger.focus();
    expect(screen.getByRole('button', { name: 'Close search' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(trigger.querySelector('svg')).toBeVisible();
  });

  test('ignores whitespace, submits an encoded trimmed query without detail parameters, and preserves history', async () => {
    const { router, user } = await setup();
    const originalLocation = router.state.location;
    await user.click(
      screen.getByRole('button', { name: 'Search movies, series and people' })
    );
    const input = screen.getByRole('combobox');
    await user.type(input, '   {Enter}');
    expect(router.state.location).toBe(originalLocation);
    await user.clear(input);
    await user.type(input, '  Amélie / A&B?  ');
    expect(getSearchSuggestions).not.toHaveBeenCalled();
    expect(getMovie).toHaveBeenCalledTimes(path.startsWith('/movie') ? 1 : 0);
    expect(getPerson).toHaveBeenCalledTimes(path.startsWith('/person') ? 1 : 0);
    await user.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe(
      `/search/${encodeURIComponent('Amélie / A&B?')}`
    );
    expect(router.state.location.search).toBe('');
    await act(async () => {
      await router.navigate(-1);
    });
    await screen.findByRole('heading', { name: title, level: 1 });
    expect(router.state.location.pathname).toBe(originalLocation.pathname);
    expect(router.state.location.search).toBe(originalLocation.search);
    await act(async () => {
      await router.navigate(1);
    });
    expect(
      screen.getByRole('heading', { name: 'Search results' })
    ).toBeVisible();
  });

  test('uses unified autocomplete on the detail route and clears it after person navigation', async () => {
    vi.mocked(getSearchSuggestions).mockResolvedValueOnce({
      suggestions: [
        { mediaType: 'movie', id: 7, title: 'Shared movie', releaseYear: 2024 },
        {
          mediaType: 'person',
          id: 99,
          name: 'Shared person',
          knownForDepartment: 'Acting',
        },
      ],
    });
    const { router, user } = await setup();
    await user.click(
      screen.getByRole('button', { name: 'Search movies, series and people' })
    );
    const input = screen.getByRole('combobox', {
      name: 'Search movies, series and people',
    });
    await user.type(input, 'Shared');
    await screen.findByRole('option', { name: 'Shared person, Acting' });
    expect(screen.getByRole('group', { name: 'Movies' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'People' })).toBeVisible();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(router.state.location.pathname).toBe('/person/99');
    expect(router.state.location.search).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('close button restores focus and Tab can leave the search', async () => {
    const { user } = await setup();
    const trigger = screen.getByRole('button', {
      name: 'Search movies, series and people',
    });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close search' }));
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.tab();
    expect(screen.getByRole('search')).not.toContainElement(
      document.activeElement as HTMLElement
    );
  });
});
