import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import Filter from './filter';

function setup(path = '/search') {
  const router = createMemoryRouter(
    [
      {
        path: '/search/:searchQuery?',
        element: (
          <>
            <Filter />
            <button type="button">Outside</button>
          </>
        ),
      },
    ],
    { initialEntries: [path] }
  );

  render(<RouterProvider router={router} />);

  return router;
}

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: /Filters & Sort/ }));

  return screen.getByRole('dialog');
};
const expand = async (name: RegExp) =>
  userEvent.click(screen.getByRole('button', { name }));
const apply = async () =>
  userEvent.click(screen.getByRole('button', { name: 'Apply' }));
const closed = async () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('drafts multiple filters, applies atomically, and displays only committed active count', async () => {
  const router = setup('/search?extra=keep');

  await open();
  await expand(/^Genre/);
  await userEvent.click(
    screen.getByRole('button', { name: 'science fiction' })
  );
  expect(screen.getByRole('button', { name: /^Genre/ })).toHaveTextContent(
    'Science fiction'
  );
  expect(
    screen.getByRole('button', { name: 'science fiction' })
  ).toHaveAttribute('aria-pressed', 'true');

  await expand(/^Release Year/);
  await userEvent.type(screen.getByLabelText('Release year'), '1979');
  await expand(/^Minimum Rating/);
  await userEvent.selectOptions(
    screen.getByLabelText('Minimum TMDB rating'),
    '8'
  );

  expect(router.state.location.search).toBe('?extra=keep');
  expect(screen.queryByLabelText(/active filters/)).toBeNull();
  expect(
    screen.getByRole('button', { name: /^Release Year/ })
  ).toHaveTextContent('1979');

  await apply();
  await closed();

  expect(router.state.location.search).toBe(
    '?extra=keep&filter=science+fiction&year=1979&rating=8'
  );
  expect(screen.getByLabelText('3 active filters')).toBeVisible();

  await open();
  expect(screen.getByLabelText('Release year')).toHaveValue('1979');
  expect(screen.getByLabelText('Minimum TMDB rating')).toHaveValue('8');
});

test('Reset only changes the draft; Escape discards it and restores focus', async () => {
  const router = setup('/search?filter=drama&year=2000&rating=7');

  await open();
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(router.state.location.search).toContain('filter=drama');
  expect(screen.getByLabelText('Release year')).toHaveValue('');
  expect(screen.getByLabelText('3 active filters')).toBeVisible();

  await userEvent.keyboard('{Escape}');
  await closed();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Filters & Sort/ })).toHaveFocus()
  );

  await open();
  expect(screen.getByLabelText('Release year')).toHaveValue('2000');
  expect(screen.getByRole('button', { name: /^Genre/ })).toHaveTextContent(
    'Drama'
  );

  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  await apply();

  expect(router.state.location.search).toBe('');
});

test('outside interaction discards edits; close control also restores focus', async () => {
  setup();

  await open();
  await expand(/^Genre/);
  await userEvent.click(screen.getByRole('button', { name: 'drama' }));

  await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
  await closed();
  await open();

  expect(screen.getByRole('button', { name: /^Genre/ })).toHaveTextContent(
    'All Genres'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Close filters' }));
  await closed();

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Filters & Sort/ })).toHaveFocus()
  );
});

test.each(['Popularity', 'Title', 'Release Date', 'Rating'])(
  'preserves supported %s sorting and explicit direction',
  async (field) => {
    const router = setup();

    await open();
    await expand(/^Sort By/);
    await userEvent.selectOptions(screen.getByLabelText('Sort field'), field);
    expect(
      screen.getByRole('button', { name: /^Sort Direction/ })
    ).toHaveTextContent('Descending');

    await expand(/^Sort Direction/);
    await userEvent.click(screen.getByRole('button', { name: 'Ascending' }));
    expect(router.state.location.search).toBe('');

    await apply();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('sorting')).toBe(
      {
        Popularity: 'popularity',
        Title: 'title',
        'Release Date': 'releaseDate',
        Rating: 'rating',
      }[field]
    );
    expect(params.get('order')).toBe('asc');

    await open();
    await expand(/^Sort By/);
    await expand(/^Sort Direction/);
    expect(screen.getByRole('button', { name: 'Ascending' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Descending' }));
    await apply();

    expect(new URLSearchParams(router.state.location.search).get('order')).toBe(
      field === 'Popularity' ? null : 'desc'
    );
  }
);

test('text search keeps relevance and normalizes unsupported and duplicate URL values', async () => {
  const router = setup(
    '/search/alien?view=people&filter=invalid&filter=drama&year=1800&rating=10&sorting=title&order=asc&extra=keep'
  );

  await waitFor(() =>
    expect(router.state.location.search).toBe('?view=people&extra=keep')
  );

  await open();
  await expand(/^Sort By/);
  expect(screen.getByText(/Sorted by relevance/)).toBeVisible();
  expect(screen.queryByLabelText('Sort field')).toBeNull();
});

test('validates single-year bounds, supports arrows and Any Year', async () => {
  const router = setup();

  await open();
  const accordion = screen.getByRole('button', { name: /^Release Year/ });
  expect(accordion).toHaveAttribute('aria-expanded', 'false');
  expect(
    document.getElementById(accordion.getAttribute('aria-controls') ?? '')
  ).toHaveAttribute('inert');

  await userEvent.click(accordion);
  expect(accordion).toHaveAttribute('aria-expanded', 'true');

  const input = screen.getByLabelText('Release year');
  await userEvent.type(input, '199');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

  await userEvent.type(input, '9{ArrowUp}');
  expect(input).toHaveValue('2000');

  await userEvent.keyboard('{ArrowDown}');
  expect(input).toHaveValue('1999');

  expect(router.state.location.search).toBe('');

  await userEvent.click(screen.getByRole('button', { name: 'Any Year' }));
  expect(input).toHaveValue('');

  await userEvent.type(input, '1873');
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
});

test('Back/Forward closes open drafts and reopening uses committed state', async () => {
  const router = setup('/search?year=2000');

  await open();
  await expand(/^Release Year/);

  await userEvent.clear(screen.getByLabelText('Release year'));
  await userEvent.type(screen.getByLabelText('Release year'), '2024');

  await apply();
  await open();

  await act(async () => {
    await router.navigate(-1);
  });

  await closed();
  await open();

  expect(screen.getByLabelText('Release year')).toHaveValue('2000');

  await act(async () => {
    await router.navigate(1);
  });

  await closed();
  await open();

  expect(screen.getByLabelText('Release year')).toHaveValue('2024');
});

test('mobile drawer contains keyboard focus, locks scrolling, dismisses via backdrop and restores focus', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('767'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );

  setup();
  const dialog = await open();
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(document.body.style.overflow).toBe('hidden');
  expect(dialog).toHaveFocus();

  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Close filters' })).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Close filters' })).toHaveFocus();

  fireEvent.click(screen.getByRole('button', { name: 'Dismiss filters' }));
  await closed();

  expect(document.body.style.overflow).toBe('');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Filters & Sort/ })).toHaveFocus()
  );
});

test('reduced motion dismisses immediately without an exit delay', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );

  setup();

  await open();
  await userEvent.keyboard('{Escape}');

  expect(screen.queryByRole('dialog')).toBeNull();
});

test('desktop panel moves above a low trigger and repositions when the viewport grows', async () => {
  vi.stubGlobal('innerHeight', 500);
  vi.stubGlobal('innerWidth', 1024);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function getRect(this: HTMLElement) {
      return this.classList.contains('movie-filters__anchor')
        ? new DOMRect(850, 400, 150, 44)
        : new DOMRect();
    }
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(480);

  setup();
  const dialog = await open();

  expect(dialog.style.top).toBe('auto');
  expect(dialog.style.bottom).toBe('110px');
  expect(dialog.style.left).toBe('520px');
  expect(dialog.style.getPropertyValue('--filter-available-height')).toBe(
    '374px'
  );
  vi.stubGlobal('innerHeight', 1000);
  fireEvent(window, new Event('resize'));

  expect(dialog.style.top).toBe('454px');
  expect(dialog.style.bottom).toBe('auto');
  expect(dialog.style.getPropertyValue('--filter-available-height')).toBe(
    '530px'
  );
});

test('mobile drawer follows visual viewport changes while the keyboard is open', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('767'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal('innerHeight', 800);
  const viewport = Object.assign(new EventTarget(), {
    height: 320,
    offsetTop: 30,
  });
  vi.stubGlobal('visualViewport', viewport);

  setup();
  const dialog = await open();

  expect(dialog.style.getPropertyValue('--filter-viewport-height')).toBe(
    '320px'
  );
  expect(dialog.style.getPropertyValue('--filter-viewport-bottom')).toBe(
    '450px'
  );
  viewport.height = 200;
  viewport.offsetTop = 40;
  viewport.dispatchEvent(new Event('resize'));

  expect(dialog.style.getPropertyValue('--filter-viewport-height')).toBe(
    '200px'
  );
  expect(dialog.style.getPropertyValue('--filter-viewport-bottom')).toBe(
    '560px'
  );
});
