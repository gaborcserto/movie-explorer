import { render, waitFor, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter as Router } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import List from './list';
import { getMovies as originalGetMovies } from '../../util/apiUtils';
import moviesReducer from '../../reducer/moviesSlice';
import modalReducer from '../../reducer/modalSlice';

const getMovies = originalGetMovies as jest.Mock;
jest.mock('../../util/apiUtils');

describe('<List />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('it displays a loading indicator while fetching data', () => {
    getMovies.mockReturnValue(new Promise(() => {}));

    render(
      <Provider
        store={configureStore({
          reducer: { movies: moviesReducer, modal: modalReducer },
        })}
      >
        <Router>
          <List />
        </Router>
      </Provider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it displays movies when the fetch is successful', async () => {
    const mockMovies = {
      data: {
        movies: [
          {
            id: 1,
            title: 'Movie 1',
            releaseDate: '2022-01-01',
            posterUrl: '/movie-1.jpg',
            genres: ['test'],
          },
          {
            id: 2,
            title: 'Movie 2',
            releaseDate: '2023-01-01',
            posterUrl: '/movie-2.jpg',
            genres: ['test', 'crime'],
          },
        ],
        total: 2,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    getMovies.mockResolvedValue(mockMovies);

    render(
      <Provider
        store={configureStore({
          reducer: { movies: moviesReducer, modal: modalReducer },
          preloadedState: {
            movies: { search: 'Movie', hash: '#loaded' },
            modal: {
              open: false,
              type: 'form',
              loading: false,
              error: null,
              movie: undefined,
              message: '',
            },
          },
        })}
      >
        <Router initialEntries={['/search?filter=crime&sorting=Release Date']}>
          <List />
        </Router>
      </Provider>
    );

    await waitFor(() => {
      const h2Element = screen.getByText(/movies found/i);
      expect(h2Element).toBeInTheDocument();

      const strongElement = document.querySelector('strong');
      expect(strongElement).not.toBeNull();
      expect(strongElement?.textContent).toBe('2');
    });

    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByText(/in genre:/i)).toHaveTextContent('Crime');
    expect(getMovies).toHaveBeenCalledWith({
      sort: 'Release Date',
      search: 'Movie',
      genres: 'crime',
      hash: '#loaded',
    });
  });

  test('it displays an error message when the fetch fails', async () => {
    getMovies.mockRejectedValue(new Error('Failed to fetch movies'));

    render(
      <Provider
        store={configureStore({
          reducer: { movies: moviesReducer, modal: modalReducer },
        })}
      >
        <Router>
          <List />
        </Router>
      </Provider>
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Error: Failed to fetch movies/)
      ).toBeInTheDocument()
    );
  });
});
