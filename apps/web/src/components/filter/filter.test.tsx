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

async function selectFilter(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: label }));
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

  it('supports Rating sorting in both directions', async () => {
    renderFilter();

    await selectSort('Rating');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=rating&order=desc'
    );
    expect(
      screen.getByRole('button', { name: 'Sort field' })
    ).toHaveTextContent('Rating');

    await selectDirection('Ascending');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?sorting=rating&order=asc'
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

  it.each([['popularity'], ['releaseDate'], ['title'], ['rating']])(
    'keeps direction visible for %s sorting',
    (sort) => {
      renderFilter(`/?sorting=${sort}&order=desc`);

      expect(
        screen.getByRole('button', { name: 'Sort direction' })
      ).toHaveTextContent('Descending');
    }
  );

  it('preserves explicit sorting when a genre changes', async () => {
    renderFilter('/?sorting=releaseDate&order=desc');

    await selectFilter('Genre', 'documentary');

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

  it('stores advanced filters in the URL while preserving search relevance', async () => {
    const user = userEvent.setup();
    renderFilter('/search/alien');

    await selectFilter('Genre', 'science fiction');
    await user.type(
      screen.getByRole('textbox', { name: 'Release year' }),
      '1979'
    );
    await selectFilter('Minimum rating', '8+');

    expect(screen.getByTestId('location')).toHaveTextContent(
      '?filter=science+fiction&year=1979&rating=8'
    );
    expect(
      screen.getByRole('button', { name: 'Sort field' })
    ).toHaveTextContent('Relevance');
  });

  it('only applies complete valid years and supports arrow-key changes', async () => {
    const user = userEvent.setup();
    renderFilter('/search');
    const yearInput = screen.getByRole('textbox', { name: 'Release year' });

    await user.type(yearInput, '199');
    expect(screen.getByTestId('location')).not.toHaveTextContent('year=');

    await user.type(yearInput, '9');
    expect(screen.getByTestId('location')).toHaveTextContent('?year=1999');

    await user.type(yearInput, '{ArrowUp}');
    expect(yearInput).toHaveValue('2000');
    expect(screen.getByTestId('location')).toHaveTextContent('?year=2000');

    await user.type(yearInput, '{ArrowDown}');
    expect(yearInput).toHaveValue('1999');
    expect(screen.getByTestId('location')).toHaveTextContent('?year=1999');

    await user.clear(yearInput);
    expect(yearInput).toHaveValue('');
    expect(yearInput).toHaveAttribute('placeholder', 'Any Year');
    expect(screen.getByTestId('location')).not.toHaveTextContent('year=');
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
