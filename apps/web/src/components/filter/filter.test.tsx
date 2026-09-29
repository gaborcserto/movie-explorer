import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Filter from './filter';

function LocationDisplay() {
  const location = useLocation();
  return <span data-testid="location">{location.search}</span>;
}

function renderFilter(initialEntry = '/') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Filter />
              <LocationDisplay />
            </>
          }
        />
        <Route
          path="/search/:searchQuery"
          element={
            <>
              <Filter />
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

async function selectSort(option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Sort field' }));
  await user.click(screen.getByRole('button', { name: option }));
}

async function selectDirection(option: 'Ascending' | 'Descending') {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Sort direction' }));
  await user.click(screen.getByRole('button', { name: option }));
}

describe('Filter component', () => {
  it('shows popularity descending as the clean default with direction control', () => {
    renderFilter();

    expect(
      screen.getByRole('button', { name: 'Sort field' })
    ).toHaveTextContent('Popularity');
    expect(
      screen.getByRole('button', { name: 'Sort direction' })
    ).toHaveTextContent('Descending');
    expect(screen.getByTestId('location')).toHaveTextContent('');
  });

  it('toggles popularity from descending to ascending', async () => {
    renderFilter();

    await selectDirection('Ascending');

    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=popularity&order=asc'
    );
    expect(
      screen.getByRole('button', { name: 'Sort direction' })
    ).toHaveTextContent('Ascending');
  });

  it('defaults Release Date sorting to newest first and toggles to oldest first', async () => {
    renderFilter();

    await selectSort('Release Date');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=releaseDate&order=desc'
    );

    await selectDirection('Ascending');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=releaseDate&order=asc'
    );
  });

  it('supports Title sorting in both directions', async () => {
    renderFilter('/?sorting=title&order=asc');

    await selectDirection('Descending');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=title&order=desc'
    );
  });

  it('preserves the current valid direction when changing sort field', async () => {
    renderFilter('/?sorting=popularity&order=asc');

    await selectSort('Release Date');

    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=releaseDate&order=asc'
    );
    expect(
      screen.getByRole('button', { name: 'Sort direction' })
    ).toHaveTextContent('Ascending');
  });

  it.each([['popularity'], ['releaseDate'], ['title']])(
    'keeps direction visible for %s sorting',
    (sort) => {
      renderFilter(`/?sorting=${sort}&order=desc`);

      expect(
        screen.getByRole('button', { name: 'Sort direction' })
      ).toHaveTextContent('Descending');
    }
  );

  it('preserves explicit sorting when a genre changes', async () => {
    const user = userEvent.setup();
    renderFilter('/?sorting=releaseDate&order=desc');

    await user.click(screen.getByRole('link', { name: 'documentary' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=releaseDate&order=desc&filter=documentary'
    );
  });

  it('represents TMDB relevance ordering during text search', () => {
    renderFilter('/search/zodiac');

    expect(
      screen.getByRole('button', { name: 'Sort field' })
    ).toHaveTextContent('Relevance');
    expect(
      screen.queryByRole('button', { name: /sort direction/i })
    ).toBeNull();
  });

  it('uses the same explicit sorting state on the movie detail route', async () => {
    renderFilter('/movie/123?sorting=releaseDate&order=desc');

    expect(
      screen.getByRole('button', { name: 'Sort field' })
    ).toHaveTextContent('Release Date');

    await selectDirection('Ascending');

    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=releaseDate&order=asc'
    );
  });
});
