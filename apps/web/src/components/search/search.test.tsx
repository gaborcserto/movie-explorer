import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Search from './search';

function LocationDisplay() {
  const location = useLocation();

  return <span data-testid="location">{location.pathname}</span>;
}

const renderSearch = (initialEntry = '/search') => {
  const onAddMovie = jest.fn();

  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/search/:searchQuery?"
          element={
            <>
              <Search onAddMovie={onAddMovie} />
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

  return { onAddMovie };
};

describe('Search Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
    fireEvent.submit(input);

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

  test('opens modal on + Add movie button click', () => {
    const { onAddMovie } = renderSearch();

    const button = screen.getByText('+ Add movie');
    fireEvent.click(button);

    expect(onAddMovie).toHaveBeenCalledTimes(1);
  });
});
