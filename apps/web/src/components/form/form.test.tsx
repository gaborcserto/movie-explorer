import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Form from './form';

const mockHandleClick = jest.fn();

describe('<Form />', () => {
  beforeEach(() => {
    mockHandleClick.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Form handleClick={mockHandleClick} title="Add Movie" />);
  });

  it('sets initial state correctly when movieData prop is passed', () => {
    const movieData = {
      id: 1,
      title: 'Test Movie',
      releaseDate: '2021-01-01',
      posterUrl: 'https://test.com/movie.jpg',
      rating: 8,
      genres: ['Action', 'Drama'],
      runtimeMinutes: 120,
      description: 'Test overview',
    };

    render(
      <Form
        handleClick={mockHandleClick}
        title="Edit Movie"
        movieData={movieData}
      />
    );

    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      'Test Movie'
    );
    expect(
      (screen.getByLabelText(/release date/i) as HTMLInputElement).value
    ).toBe('2021-01-01');
  });

  it('shows validation messages when trying to submit an empty form', async () => {
    render(<Form handleClick={mockHandleClick} title="Add Movie" />);
    // await act(async () => {
    await userEvent.click(screen.getByText(/submit/i));
    // });

    await waitFor(() => {
      const alerts = screen.queryAllByRole('alert');
      expect(alerts[0]).toHaveTextContent('Movie title is require');
    });
  });

  it('calls the handleClick function with correct data on valid form submission', async () => {
    render(<Form handleClick={mockHandleClick} title="Add Movie" />);

    await userEvent.type(screen.getByLabelText(/title/i), 'Test Movie');
    await userEvent.type(screen.getByLabelText(/release date/i), '2021-01-01');
    await userEvent.type(screen.getByLabelText(/movie url/i), 'example.com');
    await userEvent.type(screen.getByLabelText(/rating/i), '5');
    await userEvent.type(screen.getByLabelText(/runtime/i), '60');
    await userEvent.type(
      screen.getByLabelText(/overview/i),
      'Test description'
    );

    await userEvent.click(screen.getByText('Select Genre'));

    await userEvent.click(screen.getByText('Crime'));

    await userEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(mockHandleClick).toHaveBeenCalledWith({
        title: 'Test Movie',
        releaseDate: '2021-01-01',
        posterUrl: 'example.com',
        rating: 5,
        genres: ['Crime'],
        runtimeMinutes: 60,
        description: 'Test description',
      });
    });
  });

  it('resets the form correctly when clicking the Reset button', async () => {
    render(<Form handleClick={mockHandleClick} title="Add Movie" />);

    await waitFor(() => {
      userEvent.type(screen.getByLabelText(/title/i), 'Test Movie');
    });

    await waitFor(() => {
      userEvent.click(screen.getByText(/reset/i));
    });

    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe(
      ''
    );
  });
});
