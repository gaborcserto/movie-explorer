import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useParams as originalUseParams } from 'react-router-dom';
import type { MovieDetails } from '@movie-explorer/contracts';
import Details from './details';
import DetailsContent, { DetailsLowerContent } from './detailsContent';
import {
  getMovie as originalGetMovie,
  isNotFoundError as originalIsNotFoundError,
} from '../../util/apiUtils';

const getMovie = vi.mocked(originalGetMovie);
const isNotFoundError = vi.mocked(originalIsNotFoundError);
const useParams = vi.mocked(originalUseParams);

const mockData: MovieDetails = {
  cast: ['Actor One', 'Actor Two'],
  id: 1234,
  title: 'Sample Movie',
  releaseDate: '2021-01-01',
  posterUrl: '/sample.jpg',
  genres: ['Drama', 'Action'],
  rating: 8.5,
  runtimeMinutes: 120,
  description: 'A sample movie for testing purposes.',
  director: 'Director Name',
};

vi.mock('../../util/apiUtils');
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )),
  useParams: vi.fn(),
  useNavigate: vi.fn(() => vi.fn()),
  Link: vi.fn(() => null),
}));

describe('<Details />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNotFoundError.mockReturnValue(false);
  });

  it('displays the loading component while fetching data', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockReturnValueOnce(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.title).toBe('Loading movie | Movie Explorer');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('displays movie data once it is fetched', async () => {
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockResolvedValueOnce(mockData);

    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sample Movie')).toBeInTheDocument();
      expect(screen.getByText(8.5)).toBeInTheDocument();
      expect(screen.getByText('Drama, Action')).toBeInTheDocument();
      expect(screen.getByText('2021')).toBeInTheDocument();
      expect(screen.getByText('120 min')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
    expect(screen.queryByText('Director Name')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Actor One' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Credits' })).toBeNull();
    expect(getMovie).toHaveBeenCalledWith(1234, expect.any(AbortSignal));
    expect(screen.getAllByRole('main')).toHaveLength(1);
    const main = screen.getByRole('main');
    expect(main).toHaveFocus();
    expect(
      within(main).getByRole('heading', { name: mockData.title })
    ).toBeVisible();
    expect(
      within(main).getByRole('heading', { name: 'Overview' })
    ).toBeVisible();
    expect(
      within(main).queryByRole('button', { name: 'Search movies and people' })
    ).toBeNull();
    expect(document.title).toBe('Sample Movie | Movie Explorer');
  });

  it('omits unavailable and invalid metadata', () => {
    render(
      <DetailsContent
        movieData={{
          ...mockData,
          cast: [],
          description: '',
          director: undefined,
          genres: [],
          rating: undefined,
          releaseDate: '',
          runtimeMinutes: 0,
        }}
      />
    );

    expect(screen.queryByText('0 min')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Overview' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Credits' })).toBeNull();
    expect(screen.queryByLabelText(/rating/i)).toBeNull();
  });

  it('uses thumbnails in the photo grid and full images in lightbox navigation', async () => {
    const user = userEvent.setup();
    render(
      <DetailsLowerContent
        movieData={{
          ...mockData,
          photos: [
            {
              thumbnailUrl: '/first-thumbnail.jpg',
              fullUrl: '/first-original.jpg',
            },
            {
              thumbnailUrl: '/second-thumbnail.jpg',
              fullUrl: '/second-original.jpg',
            },
          ],
        }}
      />
    );

    const firstThumbnail = screen.getByRole('img', {
      name: 'Sample Movie backdrop 1',
    });
    expect(firstThumbnail).toHaveAttribute('src', '/first-thumbnail.jpg');
    expect(firstThumbnail).toHaveAttribute('loading', 'lazy');
    expect(document.querySelector('img[src="/first-original.jpg"]')).toBeNull();

    await user.click(firstThumbnail);
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
      'src',
      '/first-original.jpg'
    );

    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
      'src',
      '/second-original.jpg'
    );
    expect(screen.getByRole('dialog').querySelector('img')).not.toHaveAttribute(
      'srcset'
    );
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
      'src',
      '/first-original.jpg'
    );
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
      'src',
      '/second-original.jpg'
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('loads the hero eagerly and keeps responsive cast portraits lazy', () => {
    render(
      <>
        <DetailsContent
          movieData={{
            ...mockData,
            posterSrcSet: '/poster-large.jpg 2x',
            posterPreviewUrl: '/poster-preview.jpg',
          }}
        />
        <DetailsLowerContent
          movieData={{
            ...mockData,
            castMembers: [
              {
                name: 'Actor One',
                profileUrl: '/actor.jpg',
                profileSrcSet:
                  '/actor-small.jpg 1x, /actor-large.jpg 2x, /actor-original.jpg 3x',
              },
            ],
          }}
        />
      </>
    );
    expect(screen.getByAltText('Sample Movie')).toHaveAttribute(
      'loading',
      'eager'
    );
    expect(screen.getByAltText('Sample Movie')).toHaveAttribute(
      'srcset',
      '/poster-large.jpg 2x'
    );
    expect(screen.getByAltText('Actor One')).toHaveAttribute('loading', 'lazy');
    expect(document.querySelectorAll('.image-preview')).toHaveLength(1);
    expect(document.querySelector('.image-preview')).toHaveAttribute(
      'src',
      '/poster-preview.jpg'
    );
    expect(screen.getByAltText('Actor One')).toHaveAttribute(
      'srcset',
      '/actor-small.jpg 1x, /actor-large.jpg 2x'
    );
  });

  it('opens the highest-resolution poster from the keyboard and restores focus', async () => {
    const user = userEvent.setup();
    render(
      <DetailsContent
        movieData={{
          ...mockData,
          posterSrcSet: '/poster-large.jpg 2x, /poster-original.jpg 3x',
        }}
      />
    );
    const poster = screen.getByRole('img', { name: 'Sample Movie' });
    expect(poster).toHaveAttribute('srcset', '/poster-large.jpg 2x');
    fireEvent.load(poster);
    const trigger = screen.getByRole('button', { name: 'Sample Movie' });
    trigger.focus();
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog', {
      name: 'Sample Movie photo viewer',
    });
    expect(dialog.querySelector('img')).toHaveAttribute(
      'src',
      '/poster-original.jpg'
    );
    await user.click(
      screen.getByRole('button', { name: 'Close photo viewer' })
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('handles errors and shows an error message when fetching fails', async () => {
    useParams.mockReturnValue({ movieId: '12' });
    getMovie.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    );
    expect(
      screen.getByText("We couldn't load this information. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('shows a not-found state for missing movies', async () => {
    useParams.mockReturnValue({ movieId: '404' });
    isNotFoundError.mockReturnValue(true);
    getMovie.mockRejectedValueOnce(new Error('Movie not found'));

    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    expect(await screen.findByText('Movie not found')).toBeInTheDocument();
    expect(
      screen.getByText('We could not find that movie.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it.each([
    'unknown',
    '1e3',
    '0x10',
    '-1',
    '1.5',
    '0',
    '9007199254740992',
    ' 42',
  ])('shows an invalid-ID state for %s', async (movieId) => {
    useParams.mockReturnValue({ movieId });

    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    expect(await screen.findByText('Invalid movie ID')).toBeInTheDocument();
    expect(getMovie).not.toHaveBeenCalled();
  });

  it('retries loading movie details from a generic error state', async () => {
    const user = userEvent.setup();

    useParams.mockReturnValue({ movieId: '1234' });
    getMovie
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(mockData);

    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    await screen.findByText('Something went wrong');
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Sample Movie')).toBeInTheDocument();
    expect(getMovie).toHaveBeenCalledTimes(2);
  });

  it('shows a failed media response as an error and restores media on manual retry', async () => {
    const user = userEvent.setup();
    useParams.mockReturnValue({ movieId: '969681' });
    getMovie
      .mockRejectedValueOnce(new Error('API request failed with status 502'))
      .mockResolvedValueOnce({
        ...mockData,
        photos: [{ thumbnailUrl: '/still.jpg', fullUrl: '/original.jpg' }],
        videos: [{ name: 'Trailer', url: 'https://www.youtube.com/watch?v=1' }],
      });

    render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    expect(await screen.findByText('Something went wrong')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Backdrops' })).toBeNull();
    expect(getMovie).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(
      await screen.findByRole('heading', { name: 'Backdrops' })
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Videos & Trailers' })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Trailer' })).toBeVisible();
    expect(getMovie).toHaveBeenCalledTimes(2);
  });

  it('ignores stale details when navigating to another movie', async () => {
    let resolvePrevious: (movie: MovieDetails) => void = () => {};
    useParams.mockReturnValue({ movieId: '1234' });
    getMovie.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePrevious = resolve;
      })
    );
    const { rerender } = render(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );

    useParams.mockReturnValue({ movieId: '969681' });
    getMovie.mockResolvedValueOnce({
      ...mockData,
      id: 969681,
      title: 'Current movie',
      photos: [{ thumbnailUrl: '/current.jpg', fullUrl: '/original.jpg' }],
    });
    rerender(
      <MemoryRouter>
        <Details />
      </MemoryRouter>
    );
    await screen.findByRole('heading', { name: 'Current movie' });

    await act(async () => resolvePrevious(mockData));

    expect(
      screen.getByRole('heading', { name: 'Current movie' })
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Backdrops' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Sample Movie' })).toBeNull();
    expect(document.title).toBe('Current movie | Movie Explorer');
    expect(screen.getByRole('main')).toHaveFocus();
  });
});

test('movie retry requests cannot change the title or focus after leaving', async () => {
  document.title = 'Movie Explorer';
  useParams.mockReturnValue({ movieId: '1234' });
  let resolveRetry!: (movie: MovieDetails) => void;
  getMovie
    .mockRejectedValueOnce(new Error('Network failed'))
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = resolve;
      })
    );
  const { unmount } = render(
    <MemoryRouter>
      <Details />
    </MemoryRouter>
  );
  await screen.findByText('Something went wrong');
  expect(document.title).toBe('Something went wrong | Movie Explorer');
  expect(screen.getByRole('main')).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(document.title).toBe('Loading movie | Movie Explorer');
  unmount();
  const destination = document.createElement('button');
  document.body.append(destination);
  destination.focus();
  await act(async () => {
    resolveRetry(mockData);
  });
  expect(document.title).toBe('Movie Explorer');
  expect(destination).toHaveFocus();
  destination.remove();
});

test('photo names and full-image viewing survive missing or failed thumbnails', async () => {
  render(
    <DetailsLowerContent
      movieData={{
        ...mockData,
        photos: [
          { thumbnailUrl: '/broken.jpg', fullUrl: '/full.jpg', alt: '' },
          { thumbnailUrl: '', fullUrl: '/second-full.jpg' },
          { thumbnailUrl: '/orphan.jpg', fullUrl: '' },
        ],
      }}
    />
  );
  const photo = screen.getByRole('button', {
    name: 'View Sample Movie backdrop 1',
  });
  fireEvent.error(photo.querySelector('img')!);
  expect(photo.querySelector('img')).toBeNull();
  expect(photo.querySelector('.image-placeholder')).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'View Sample Movie backdrop 2' })
  ).toBeVisible();
  expect(document.querySelector('img[src="/orphan.jpg"]')).toBeNull();
  await userEvent.click(photo);
  expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute(
    'src',
    '/full.jpg'
  );
});

test('missing movies keep a useful landmark and document title', async () => {
  useParams.mockReturnValue({ movieId: '404' });
  isNotFoundError.mockReturnValue(true);
  getMovie.mockRejectedValueOnce(new Error('Not found'));
  render(
    <MemoryRouter>
      <Details />
    </MemoryRouter>
  );
  await screen.findByText('Movie not found');
  await waitFor(() =>
    expect(document.title).toBe('Movie not found | Movie Explorer')
  );
  expect(screen.getByRole('main')).toHaveFocus();
});
