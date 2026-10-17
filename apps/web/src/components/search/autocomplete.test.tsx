import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { SearchSuggestionsResponse } from '@movie-explorer/contracts';
import Search from './search';
import HeaderSearch from './headerSearch';
import { getSearchSuggestions } from '../../util/apiUtils';

vi.mock('../../util/apiUtils');
const api = vi.mocked(getSearchSuggestions);
const mixed: SearchSuggestionsResponse = {
  suggestions: [
    {
      mediaType: 'person',
      id: 42,
      name: 'Sigourney Weaver',
      knownForDepartment: 'Acting',
      profileUrl: '/portrait.jpg',
    },
    {
      mediaType: 'movie',
      id: 42,
      title: 'Alien',
      releaseYear: 1979,
      posterUrl: '/poster.jpg',
    },
    { mediaType: 'person', id: 43, name: 'Missing portrait' },
    { mediaType: 'movie', id: 43, title: 'Missing poster' },
  ],
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const tick = async (time = 300) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(time);
  });

beforeEach(() => {
  vi.useFakeTimers();
  api.mockReset();
  api.mockResolvedValue(mixed);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe.each(['home', 'movie', 'person'])(
  '%s unified autocomplete',
  (kind) => {
    function setup() {
      const path = kind === 'home' ? '/search' : `/${kind}/1`;
      const router = createMemoryRouter(
        [
          {
            path: '/search/:searchQuery?',
            element: kind === 'home' ? <Search /> : <h1>Results</h1>,
          },
          {
            path: '/movie/:id',
            element: kind === 'movie' ? <HeaderSearch /> : <h1>Movie</h1>,
          },
          {
            path: '/person/:id',
            element: kind === 'person' ? <HeaderSearch /> : <h1>Person</h1>,
          },
        ],
        { initialEntries: [path] }
      );
      render(<RouterProvider router={router} />);
      if (kind !== 'home')
        fireEvent.click(
          screen.getByRole('button', { name: 'Search movies and people' })
        );
      const input = screen.getByRole('combobox', {
        name: 'Search movies and people',
      });
      input.focus();
      const type = (text: string) =>
        fireEvent.change(input, { target: { value: text } });
      return { router, input, type };
    }

    test('debounces, bounds and groups movie/person options with metadata and shared placeholders', async () => {
      const { input, type } = setup();
      type('A');
      await tick();
      expect(api).not.toHaveBeenCalled();
      type('Al');
      await tick(299);
      expect(api).not.toHaveBeenCalled();
      await tick(1);
      expect(api).toHaveBeenCalledWith('Al', expect.any(AbortSignal));
      const list = screen.getByRole('listbox', {
        name: 'Movie and person suggestions',
      });
      expect(
        within(list).getByRole('group', { name: 'Movies' })
      ).toHaveTextContent('Alien1979');
      expect(
        within(list).getByRole('group', { name: 'People' })
      ).toHaveTextContent('Sigourney WeaverActing');
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent)
      ).toEqual([
        'Alien1979',
        'Missing poster',
        'Sigourney WeaverActing',
        'Missing portrait',
      ]);
      expect(list.querySelectorAll('.image-placeholder')).toHaveLength(2);
      expect(
        list.querySelector('img[src="/portrait.jpg"]')
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        '4 suggestions available'
      );
      expect(input).toHaveFocus();
    });

    test('wraps keyboard navigation, scrolls the active option, clears selection on edit and opens people', async () => {
      const scroll = vi.fn();
      const previous = HTMLElement.prototype.scrollIntoView;
      HTMLElement.prototype.scrollIntoView = scroll;
      try {
        const { input, type, router } = setup();
        type('Al');
        await tick();
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        expect(screen.getAllByRole('option')[3]).toHaveAttribute(
          'aria-selected',
          'true'
        );
        expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
        expect(scroll.mock.instances.at(-1)).toBe(
          screen.getAllByRole('option')[3]
        );
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(screen.getAllByRole('option')[0]).toHaveAttribute(
          'aria-selected',
          'true'
        );
        type('Ali');
        expect(input).not.toHaveAttribute('aria-activedescendant');
        expect(screen.queryByRole('listbox')).toBeNull();
        await tick();
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(router.state.location.pathname).toBe('/person/42');
        expect(screen.queryByRole('listbox')).toBeNull();
      } finally {
        HTMLElement.prototype.scrollIntoView = previous;
      }
    });

    test('clicking a movie opens its stable ID without shifting input focus first', async () => {
      const { input, type, router } = setup();
      type('Al');
      await tick();
      const option = screen.getByRole('option', { name: 'Alien, 1979' });
      fireEvent.mouseDown(option);
      expect(input).toHaveFocus();
      fireEvent.click(option);
      expect(router.state.location.pathname).toBe('/movie/42');
    });

    test.each(['Escape', 'outside', 'blur'])(
      'dismissal by %s cancels outstanding work and cannot reopen from its response',
      async (dismissal) => {
        const pending = deferred<SearchSuggestionsResponse>();
        api.mockReturnValueOnce(pending.promise);
        const { input, type } = setup();
        type('Al');
        await tick();
        expect(screen.getByRole('status')).toHaveTextContent(
          'Loading suggestions'
        );
        const signal = api.mock.calls[0][1];
        if (dismissal === 'Escape') fireEvent.keyDown(input, { key: 'Escape' });
        else if (dismissal === 'outside') fireEvent.mouseDown(document.body);
        else fireEvent.blur(input, { relatedTarget: document.body });
        expect(signal?.aborted).toBe(true);
        await act(async () => {
          pending.resolve(mixed);
        });
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(input).not.toHaveAttribute('aria-activedescendant');
        if (kind !== 'home' && dismissal === 'Escape')
          expect(
            screen.getByRole('button', { name: 'Search movies and people' })
          ).toHaveFocus();
      }
    );

    test('ignores stale responses on rapid edits, aborts on unmount and announces empty/error results', async () => {
      const old = deferred<SearchSuggestionsResponse>();
      api
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce({ suggestions: [] })
        .mockRejectedValueOnce(new Error('Unavailable'));
      const { input, type, router } = setup();
      type('Al');
      await tick();
      const signal = api.mock.calls[0][1];
      type('Alien');
      expect(signal?.aborted).toBe(true);
      await tick();
      expect(screen.getByRole('status')).toHaveTextContent(
        'No suggestions found'
      );
      await act(async () => {
        old.resolve(mixed);
      });
      expect(screen.queryByRole('listbox')).toBeNull();
      type('Aliens');
      await tick();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Suggestions unavailable'
      );
      expect(input).not.toHaveAttribute('aria-activedescendant');
      await act(async () => {
        await router.navigate('/search/committed');
      });
      expect(api.mock.calls.at(-1)?.[1]?.aborted).toBe(true);
    });

    test('Enter without an active suggestion commits the encoded typed query', async () => {
      const { input, type, router } = setup();
      type(' A&B / test? ');
      await tick();
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.submit(screen.getByRole('search'));
      expect(router.state.location.pathname).toBe(
        `/search/${encodeURIComponent('A&B / test?')}`
      );
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  }
);

test('caps each suggestion group at six options', async () => {
  api.mockResolvedValue({
    suggestions: Array.from({ length: 20 }, (_, index) => ({
      mediaType: 'person',
      id: index + 1,
      name: `Person ${index}`,
    })),
  });
  render(
    <RouterProvider
      router={createMemoryRouter([{ path: '/', element: <Search /> }])}
    />
  );
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'Person' },
  });
  await tick();
  expect(screen.getAllByRole('option')).toHaveLength(6);
});
