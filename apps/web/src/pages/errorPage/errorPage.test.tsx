import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ErrorPage from './errorPage';

describe('ErrorPage component', () => {
  it('sets the title and initial focus without stealing focus on rerender', async () => {
    const user = userEvent.setup();
    document.title = 'Movie Explorer';
    const page = (
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>
    );
    const { rerender, unmount } = render(page);

    expect(document.title).toBe('Page not found | Movie Explorer');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Looks like this scene is missing.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();
    const action = screen.getByRole('link', { name: 'Back to Search' });
    expect(action).toHaveFocus();
    rerender(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>
    );
    expect(action).toHaveFocus();
    unmount();
    expect(document.title).toBe('Movie Explorer');
  });

  it('navigates to Search without offering an unsafe history action', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/missing']}>
        <Routes>
          <Route path="*" element={<ErrorPage />} />
          <Route path="/search" element={<h1>Search destination</h1>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    await user.click(screen.getByRole('link', { name: 'Back to Search' }));
    expect(
      screen.getByRole('heading', { name: 'Search destination' })
    ).toBeVisible();
  });
});
