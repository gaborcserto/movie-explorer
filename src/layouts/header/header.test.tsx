import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import {
  MemoryRouter,
  Route,
  Routes,
  useParams as originalUseParams,
} from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Header from './header';
import moviesReducer from '../../reducer/moviesSlice';
import modalReducer from '../../reducer/modalSlice';

const useParams = originalUseParams as jest.Mock;

const mockStore = configureStore({
  reducer: {
    movies: moviesReducer,
    modal: modalReducer,
  },
});

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

describe('Header component', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the Details component if movieId is present', () => {
    useParams.mockReturnValue({ movieId: '1234' });

    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={['/movies/1234']}>
          <Routes>
            <Route path="/movies/:movieId" element={<Header />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('details-component')).toBeInTheDocument();
    expect(screen.queryByTestId('search-component')).toBeNull();
  });

  it('renders the Search component if movieId is not present', () => {
    useParams.mockReturnValue({});

    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="*" element={<Header />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('search-component')).toBeInTheDocument();
    expect(screen.queryByTestId('details-component')).toBeNull();
  });
});
