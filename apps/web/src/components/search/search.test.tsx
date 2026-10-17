import { act, render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Search from './search';
import { getSearchSuggestions as originalGetMovieSuggestions } from '../../util/apiUtils';

vi.mock('../../util/apiUtils');
const getSearchSuggestions = vi.mocked(originalGetMovieSuggestions);

function LocationDisplay() {
  const location = useLocation();

  return (
    <span data-testid="location">
      {location.pathname}
      {location.search}
    </span>
  );
}

const renderSearch = (initialEntry = '/search') => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/search/:searchQuery?"
          element={
            <>
              <Search />
              <LocationDisplay />
            </>
          }
        />
        <Route path="/movie/:movieId" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Search Component', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  test('renders Search component', () => {
    renderSearch();

    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toBeInTheDocument();
  });

  test('updates input value on change', () => {
    renderSearch();

    const input = screen.getByPlaceholderText(
      'What do you want to watch?'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Inception' } });

    expect(input.value).toBe('Inception');
  });

  test('navigates to search results on form submission', () => {
    renderSearch();
    const input = screen.getByPlaceholderText('What do you want to watch?');
    expect(screen.getByRole('button', { name: 'search' })).toHaveClass(
      'btn--primary',
      'btn'
    );
    fireEvent.change(input, { target: { value: 'Inception' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/search/Inception'
    );
  });

  test('preserves committed search controls and strips detail-only parameters on submission', () => {
    renderSearch(
      '/search/Old?view=people&filter=drama&photo=2&personSort=title'
    );
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: ' New & query ' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/search/New%20%26%20query?view=people&filter=drama'
    );
    expect(screen.getByRole('combobox')).toHaveValue('New & query');
  });

  test('uses the URL search query as the initial search value', () => {
    renderSearch('/search/avatar');

    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toHaveValue('avatar');
  });

  test('debounces suggestions and supports keyboard selection', async () => {
    vi.useFakeTimers();
    getSearchSuggestions.mockResolvedValue({
      suggestions: [
        {
          mediaType: 'movie' as const,
          id: 42,
          title: 'Alien',
          releaseYear: 1979,
          posterUrl: '/alien.jpg',
        },
        {
          mediaType: 'movie' as const,
          id: 43,
          title: 'Aliens',
          releaseYear: 1986,
        },
      ],
    });
    renderSearch();
    const input = screen.getByRole('combobox', {
      name: 'Search movies and people',
    });

    fireEvent.change(input, { target: { value: 'Al' } });
    expect(getSearchSuggestions).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(getSearchSuggestions).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      `${input.getAttribute('aria-controls')}-0`
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      `${input.getAttribute('aria-controls')}-1`
    );
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('location')).toHaveTextContent('/movie/43');
  });

  test('ignores stale autocomplete results and closes with Escape', async () => {
    vi.useFakeTimers();
    let resolveFirst:
      | ((value: {
          suggestions: { mediaType: 'movie'; id: number; title: string }[];
        }) => void)
      | undefined;
    getSearchSuggestions
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
      )
      .mockResolvedValueOnce({
        suggestions: [{ mediaType: 'movie' as const, id: 2, title: 'Alien' }],
      });
    renderSearch();
    const input = screen.getByRole('combobox', {
      name: 'Search movies and people',
    });

    fireEvent.change(input, { target: { value: 'Al' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.change(input, { target: { value: 'Alien' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByText('Alien')).toBeInTheDocument();

    await act(async () => {
      resolveFirst?.({
        suggestions: [{ mediaType: 'movie' as const, id: 1, title: 'Stale' }],
      });
      await Promise.resolve();
    });
    expect(screen.queryByText('Stale')).toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
