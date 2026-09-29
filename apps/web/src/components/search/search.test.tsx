import { act, render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Search from './search';
import { getMovieSuggestions as originalGetMovieSuggestions } from '../../util/apiUtils';

vi.mock('../../util/apiUtils');
const getMovieSuggestions = vi.mocked(originalGetMovieSuggestions);

function LocationDisplay() {
  const location = useLocation();

  return <span data-testid="location">{location.pathname}</span>;
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
    fireEvent.change(input, { target: { value: 'Inception' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/search/Inception'
    );
  });

  test('uses the URL search query as the initial search value', () => {
    renderSearch('/search/avatar');

    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toHaveValue('avatar');
  });

  test('debounces suggestions and supports keyboard selection', async () => {
    vi.useFakeTimers();
    getMovieSuggestions.mockResolvedValue({
      suggestions: [
        { id: 42, title: 'Alien', releaseYear: 1979, posterUrl: '/alien.jpg' },
        { id: 43, title: 'Aliens', releaseYear: 1986 },
      ],
    });
    renderSearch();
    const input = screen.getByRole('combobox', { name: 'Search movies' });

    fireEvent.change(input, { target: { value: 'Al' } });
    expect(getMovieSuggestions).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(getMovieSuggestions).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      'movie-suggestion-0'
    );
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      'movie-suggestion-1'
    );
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('location')).toHaveTextContent('/movie/43');
  });

  test('ignores stale autocomplete results and closes with Escape', async () => {
    vi.useFakeTimers();
    let resolveFirst:
      | ((value: { suggestions: { id: number; title: string }[] }) => void)
      | undefined;
    getMovieSuggestions
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
      )
      .mockResolvedValueOnce({ suggestions: [{ id: 2, title: 'Alien' }] });
    renderSearch();
    const input = screen.getByRole('combobox', { name: 'Search movies' });

    fireEvent.change(input, { target: { value: 'Al' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.change(input, { target: { value: 'Alien' } });
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByText('Alien')).toBeInTheDocument();

    await act(async () => {
      resolveFirst?.({ suggestions: [{ id: 1, title: 'Stale' }] });
      await Promise.resolve();
    });
    expect(screen.queryByText('Stale')).toBeNull();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
