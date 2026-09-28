import { render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useParams as originalUseParams,
} from 'react-router-dom';
import Header from './header';

const useParams = vi.mocked(originalUseParams);

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )),
  useParams: vi.fn(),
}));

describe('Header component', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the Details component if movieId is present', () => {
    useParams.mockReturnValue({ movieId: '1234' });

    render(
      <MemoryRouter initialEntries={['/movies/1234']}>
        <Routes>
          <Route
            path="/movies/:movieId"
            element={<Header onAddMovie={vi.fn()} />}
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
          <Route path="*" element={<Header onAddMovie={vi.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('search-component')).toBeInTheDocument();
    expect(screen.queryByTestId('details-component')).toBeNull();
  });
});
