import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter as Router } from 'react-router-dom';
import Filter from './filter';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )),
}));

describe('Filter component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default options', () => {
    render(
      <Router>
        <Filter />
      </Router>
    );
    const linkElement = screen.getByText(/all/i);
    expect(linkElement).toHaveAttribute(
      'class',
      'menu__link menu__link--active'
    );
  });

  it('changes filter when a genre is clicked', async () => {
    render(
      <Router>
        <Filter />
      </Router>
    );
    const documentaryLink = screen.getByText('documentary');

    await act(async () => {
      await userEvent.click(documentaryLink);
    });

    expect(documentaryLink).toHaveAttribute(
      'class',
      'menu__link menu__link--active'
    );
  });

  it('changes filter when a genre is reset', async () => {
    render(
      <Router>
        <Filter />
      </Router>
    );
    const documentaryLink = screen.getByText('all');

    act(() => {
      userEvent.click(documentaryLink);
    });

    expect(documentaryLink).toHaveAttribute('href', '/');
    expect(documentaryLink).toHaveAttribute(
      'class',
      'menu__link menu__link--active'
    );
  });

  it('changes sorting when a different option is selected', async () => {
    render(
      <Router>
        <Filter />
      </Router>
    );

    await act(async () => {
      await userEvent.click(screen.getByText('title'));
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Release Date'));
    });

    const selectedOption = screen.getByText('release date');
    expect(selectedOption).toBeInTheDocument();
  });
});
