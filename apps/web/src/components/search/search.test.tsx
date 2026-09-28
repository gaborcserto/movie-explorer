import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import moviesReducer from '../../reducer/moviesSlice';
import modalReducer from '../../reducer/modalSlice';
import Search from './search';

const createMockStore = () =>
  configureStore({
    reducer: {
      movies: moviesReducer,
      modal: modalReducer,
    },
  });

function LocationDisplay() {
  const location = useLocation();

  return <span data-testid="location">{location.pathname}</span>;
}

const renderSearch = (initialEntry = '/search') => {
  const store = createMockStore();

  render(
    <Provider store={store}>
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
        </Routes>
      </MemoryRouter>
    </Provider>
  );

  return store;
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
    const store = renderSearch();
    const input = screen.getByPlaceholderText('What do you want to watch?');
    fireEvent.change(input, { target: { value: 'Inception' } });
    fireEvent.submit(input);

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/search/Inception'
    );
    expect(store.getState().movies.search).toBe('Inception');
  });

  test('uses the URL search query as the initial search value', () => {
    const store = renderSearch('/search/avatar');

    expect(
      screen.getByPlaceholderText('What do you want to watch?')
    ).toHaveValue('avatar');
    expect(store.getState().movies.search).toBe('avatar');
  });

  test('opens modal on + Add movie button click', () => {
    const store = renderSearch();

    const button = screen.getByText('+ Add movie');
    fireEvent.click(button);

    expect(store.getState().modal).toMatchObject({
      open: true,
      type: 'add',
      movie: undefined,
    });
  });
});
