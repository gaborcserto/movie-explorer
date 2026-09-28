import { render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useParams as originalUseParams,
} from 'react-router-dom';
import Header from './header';

const useParams = originalUseParams as jest.Mock;

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
      <MemoryRouter initialEntries={['/movies/1234']}>
        <Routes>
          <Route
            path="/movies/:movieId"
            element={<Header onAddMovie={jest.fn()} />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('details-component')).toBeInTheDocument();
    expect(screen.queryByTestId('search-component')).toBeNull();
  });

  it('renders the Search component if movieId is not present', () => {
    useParams.mockReturnValue({});

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<Header onAddMovie={jest.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('search-component')).toBeInTheDocument();
    expect(screen.queryByTestId('details-component')).toBeNull();
  });
});
