import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import Header from './header';

function CurrentLocation() {
  const location = useLocation();

  return (
    <output data-testid="current-location">
      {location.pathname}
      {location.search}
    </output>
  );
}

describe('Header component', () => {
  it('keeps the brand in one shared position and offers detail search on detail routes', () => {
    render(
      <MemoryRouter initialEntries={['/movie/1234']}>
        <Routes>
          <Route path="/movie/:movieId" element={<Header />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('link', { name: 'MovieExplorer' })
    );
    expect(screen.queryByRole('link', { name: 'Library' })).toBeNull();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('shows the shared brand without duplicating search controls on Search', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<Header />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'MovieExplorer' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.queryByRole('link', { name: 'Library' })).toBeNull();
    expect(screen.getByRole('banner')).toHaveClass('app-header--search');
    expect(screen.queryByRole('button', { name: /search/i })).toBeNull();
  });

  it('keeps the Home redirect header integrated with the Search hero', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Header />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('banner')).toHaveClass('app-header--search');
  });

  it('shows the shared expandable search on Library without adding Library navigation', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <Routes>
          <Route path="/library" element={<Header />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Library' })).toBeNull();
  });

  it('returns to the clean Discover route from Library with the brand link', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/library?view=tv&filter=drama&sorting=title&page=3']}
      >
        <CurrentLocation />
        <Routes>
          <Route path="/library" element={<Header />} />
          <Route path="/" element={<Header />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('link', { name: 'MovieExplorer' }));

    expect(screen.getByTestId('current-location')).toHaveTextContent('/');
    expect(screen.getByTestId('current-location')).not.toHaveTextContent('?');
  });
});
