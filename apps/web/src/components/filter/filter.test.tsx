import {
  act,
  cleanup,
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
  expect(screen.queryByText('Selected', { exact: true })).toBeNull();
  expect(screen.queryByText('Available', { exact: true })).toBeNull();
  expect(screen.queryByText('All Genres', { exact: true })).toBeNull();
  expect(screen.getByRole('group', { name: 'Selected genres' })).toBeVisible();
  expect(screen.getByRole('group', { name: 'Available genres' })).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Select science fiction genre' })
  );
  expect(screen.getByRole('heading', { name: 'Genre' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Remove science fiction genre' })
  ).toBeVisible();

  await userEvent.type(screen.getByLabelText('Release Year'), '1979');
  fireEvent.change(screen.getByLabelText('Minimum TMDB rating slider'), {
    target: { value: '8' },
  });

  expect(router.state.location.search).toBe('?extra=keep');
  expect(screen.queryByLabelText(/active filters/)).toBeNull();
  expect(screen.getByLabelText('Release Year')).toHaveValue('1979');

  await apply();
  await closed();

  expect(router.state.location.search).toBe(
    '?extra=keep&filter=science+fiction&year=1979&rating=8'
  );
  expect(screen.getByLabelText('3 active filters')).toBeVisible();

  await open();
  expect(screen.getByLabelText('Release Year')).toHaveValue('1979');
  expect(screen.getByLabelText('Minimum TMDB rating slider')).toHaveValue('8');
});

test('counts each applied genre while excluding default sorting and draft changes', async () => {
  const router = setup('/search?filter=action,adventure,crime');

  expect(screen.getByLabelText('3 active filters')).toBeVisible();
  await open();
  await userEvent.click(
    screen.getByRole('button', { name: 'Select drama genre' })
  );
  expect(screen.getByLabelText('3 active filters')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  await apply();
  await closed();
  expect(router.state.location.search).toBe('');
  expect(screen.queryByLabelText(/active filters/)).toBeNull();
});

test('Reset only changes the draft; Escape discards it and restores focus', async () => {
  const router = setup('/search?filter=drama&year=2000&rating=7');

  await open();
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(router.state.location.search).toContain('filter=drama');
  expect(screen.getByLabelText('Release Year')).toHaveValue('');
  expect(screen.getByLabelText('3 active filters')).toBeVisible();

  await userEvent.keyboard('{Escape}');
  await closed();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Filters & Sort/ })).toHaveFocus()
  );

  await open();
  expect(screen.getByLabelText('Release Year')).toHaveValue('2000');
  expect(
    screen.getByRole('button', { name: 'Remove drama genre' })
  ).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  await apply();

  expect(router.state.location.search).toBe('');
});

test('backdrop dismissal discards edits; close control also restores focus', async () => {
  setup();

  await open();
  await userEvent.click(
    screen.getByRole('button', { name: 'Select drama genre' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss Filters & Sort' })
  );
  await closed();
  await open();

  expect(
    screen.getByRole('button', { name: 'Select drama genre' })
  ).toBeVisible();
  await userEvent.click(
    screen.getByRole('button', { name: 'Close Filters & Sort' })
  );
  await closed();

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Filters & Sort/ })).toHaveFocus()
  );
});

test('genre multi-selection uses OR filter values and leaves the selected group empty after removal', async () => {
  const router = setup();

  await open();
  await userEvent.click(
    screen.getByRole('button', { name: 'Select drama genre' })
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Select comedy genre' })
  );
  expect(
    screen.getByRole('button', { name: 'Remove drama genre' })
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Remove comedy genre' })
  ).toBeVisible();
  await apply();
  await closed();

  expect(new URLSearchParams(router.state.location.search).get('filter')).toBe(
    'comedy,drama'
  );

  await act(async () => router.navigate(-1));
  expect(router.state.location.search).toBe('');
  await act(async () => router.navigate(1));

  await open();
  await userEvent.click(
    screen.getByRole('button', { name: 'Remove drama genre' })
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Remove comedy genre' })
  );
  expect(screen.queryByText('All Genres', { exact: true })).toBeNull();
  expect(
    screen.getByRole('group', { name: 'Selected genres' })
  ).toBeEmptyDOMElement();
  expect(screen.getByRole('group', { name: 'Available genres' })).toBeVisible();
  await apply();

  expect(router.state.location.search).toBe('');
});

test.each([
  ['Popularity', 'Popularity'],
  ['Title', 'Title'],
  ['Date', 'Release Date'],
  ['Rating', 'Rating'],
])(
  'preserves supported %s sorting and explicit direction',
  async (field, sortValue) => {
    const router = setup();

    await open();
    await userEvent.click(screen.getByRole('button', { name: field }));
    expect(
      screen.getByRole('heading', { name: 'Sort Direction' })
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Ascending' }));
    expect(screen.getByRole('button', { name: 'Ascending' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(router.state.location.search).toBe('');

    await apply();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('sorting')).toBe(
      {
        Popularity: 'popularity',
        Title: 'title',
        'Release Date': 'releaseDate',
        Rating: 'rating',
      }[sortValue]
    );
    expect(params.get('order')).toBe('asc');

    await open();
    expect(screen.getByRole('button', { name: field })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Ascending' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const descending = screen.getByRole('button', { name: 'Descending' });
    descending.focus();
    await userEvent.keyboard('{Enter}');
    expect(descending).toHaveAttribute('aria-pressed', 'true');
    await apply();

    expect(new URLSearchParams(router.state.location.search).get('order')).toBe(
      field === 'Popularity' ? null : 'desc'
    );
  }
);

test('Series year filtering is labeled as Date and Year while keeping URL semantics', async () => {
  const router = setup('/search?view=tv&year=2001');

  await open();
  expect(screen.getByRole('heading', { name: 'Date' })).toBeVisible();
  expect(screen.getByLabelText('Year')).toHaveValue('2001');
  expect(screen.queryByText('First-air Year')).toBeNull();
  expect(screen.queryByLabelText('First-air year')).toBeNull();

  await userEvent.clear(screen.getByLabelText('Year'));
  await userEvent.type(screen.getByLabelText('Year'), '2012');
  await userEvent.click(screen.getByRole('button', { name: 'Date' }));
  expect(screen.getByRole('button', { name: 'Date' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await apply();

  const params = new URLSearchParams(router.state.location.search);
  expect(params.get('view')).toBe('tv');
  expect(params.get('year')).toBe('2012');
  expect(params.get('sorting')).toBe('releaseDate');
});

test('text search keeps relevance and normalizes unsupported and duplicate URL values', async () => {
  const router = setup(
    '/search/alien?view=people&filter=invalid&filter=drama&year=1800&rating=11&sorting=title&order=asc&extra=keep'
  );

  await waitFor(() =>
    expect(router.state.location.search).toBe(
      '?view=people&filter=drama&extra=keep'
    )
  );

  await open();
  expect(screen.getByText(/Sorted by relevance/)).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Sort by' })).toBeNull();
});

test('validates single-year bounds, supports arrows and Any Year', async () => {
  const router = setup();

  await open();
  expect(screen.getByRole('heading', { name: 'Release Year' })).toBeVisible();
  const input = screen.getByLabelText('Release Year');
  expect(input).toHaveAttribute('placeholder', 'Any Year');
  expect(input).toHaveAttribute('inputmode', 'numeric');
  expect(
    screen.queryByText('Leave empty for Any Year.', { exact: true })
  ).toBeNull();
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveAttribute('inputmode', 'numeric');
  await userEvent.type(input, '199');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

  await userEvent.type(input, '9{ArrowUp}');
  expect(input).toHaveValue('2000');

  await userEvent.keyboard('{ArrowDown}');
  expect(input).toHaveValue('1999');

  expect(router.state.location.search).toBe('');

  await userEvent.clear(input);
  expect(input).toHaveValue('');

  await userEvent.type(input, '1873');
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
});

test('rating input and slider stay synchronized for Any, half steps, and 10', async () => {
  const router = setup('/search?rating=7.5');

  await open();
  const slider = screen.getByLabelText('Minimum TMDB rating slider');
  const ratingInput = screen.getByLabelText('Minimum TMDB rating');
  expect(
    screen.getByRole('heading', { name: 'Minimum Rating' }).parentElement
  ).toContainElement(ratingInput);
  expect(screen.queryByLabelText('Maximum rating 10')).toBeNull();
  expect(slider).toHaveValue('7.5');
  expect(slider).toHaveAttribute('step', '0.5');
  expect(ratingInput).toHaveValue('7.5');

  await userEvent.clear(ratingInput);
  expect(slider).toHaveValue('0');
  await userEvent.type(ratingInput, '5.5');
  expect(slider).toHaveValue('5.5');
  expect(ratingInput).toHaveValue('5.5');
  expect(router.state.location.search).toBe('?rating=7.5');
  await apply();
  await closed();
  expect(router.state.location.search).toBe('?rating=5.5');

  await open();
  const reopenedRatingInput = screen.getByLabelText('Minimum TMDB rating');
  const reopenedSlider = screen.getByLabelText('Minimum TMDB rating slider');
  fireEvent.change(reopenedSlider, { target: { value: '10' } });
  expect(reopenedRatingInput).toHaveValue('10');
  await apply();
  await closed();
  expect(router.state.location.search).toBe('?rating=10');

  await open();
  const anyRatingInput = screen.getByLabelText('Minimum TMDB rating');
  const anyRatingSlider = screen.getByLabelText('Minimum TMDB rating slider');
  expect(anyRatingSlider).toHaveValue('10');
  await userEvent.clear(anyRatingInput);
  expect(anyRatingSlider).toHaveValue('0');
  await apply();
  expect(new URLSearchParams(router.state.location.search).has('rating')).toBe(
    false
  );
});

test('year picker selects recent and older years, closes with Escape, and restores focus', async () => {
  setup();
  await open();
  const input = screen.getByLabelText('Release Year');
  const trigger = screen.getByRole('button', { name: 'Choose a year' });

  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const recentYear = String(new Date().getFullYear() - 1);
  await userEvent.click(screen.getByRole('button', { name: recentYear }));
  expect(input).toHaveValue(recentYear);
  expect(input).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('button', { name: 'Earlier years' }));
  const olderYear = String(new Date().getFullYear() - 12);
  await userEvent.click(screen.getByRole('button', { name: olderYear }));
  expect(input).toHaveValue(olderYear);

  await userEvent.click(trigger);
  await userEvent.tab();
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('rating rejects invalid manual values and Date keeps the existing sort value', async () => {
  setup();
  await open();
  const ratingInput = screen.getByLabelText('Minimum TMDB rating');
  await userEvent.type(ratingInput, '7.2');
  expect(ratingInput).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

  await userEvent.clear(ratingInput);
  await userEvent.type(ratingInput, '7.5');
  expect(screen.getByLabelText('Minimum TMDB rating slider')).toHaveValue(
    '7.5'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Date' }));
  expect(screen.getByRole('button', { name: 'Date' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('rating input arrows adjust by half steps, clamp at bounds, and preserve invalid text', async () => {
  const router = setup();

  await open();
  const ratingInput = screen.getByLabelText('Minimum TMDB rating');
  const slider = screen.getByLabelText('Minimum TMDB rating slider');
  ratingInput.focus();

  await userEvent.keyboard('{ArrowUp}');
  expect(ratingInput).toHaveValue('0.5');
  expect(slider).toHaveValue('0.5');
  await userEvent.keyboard('{ArrowUp}');
  expect(ratingInput).toHaveValue('1');
  expect(slider).toHaveValue('1');
  await userEvent.keyboard('{ArrowDown}');
  expect(ratingInput).toHaveValue('0.5');
  expect(slider).toHaveValue('0.5');
  await userEvent.keyboard('{ArrowDown}');
  expect(ratingInput).toHaveValue('');
  expect(slider).toHaveValue('0');

  await userEvent.keyboard('{ArrowDown}');
  expect(ratingInput).toHaveValue('');
  await userEvent.type(ratingInput, '10');
  await userEvent.keyboard('{ArrowUp}');
  expect(ratingInput).toHaveValue('10');
  expect(slider).toHaveValue('10');
  await userEvent.keyboard('{ArrowDown}');
  expect(ratingInput).toHaveValue('9.5');
  expect(slider).toHaveValue('9.5');

  await userEvent.clear(ratingInput);
  await userEvent.type(ratingInput, '7.2');
  await userEvent.keyboard('{ArrowUp}');
  expect(ratingInput).toHaveValue('7.2');
  expect(ratingInput).toHaveAttribute('aria-invalid', 'true');
  expect(slider).toHaveValue('0');
  expect(router.state.location.search).toBe('');
});

test('Back/Forward closes open drafts and reopening uses committed state', async () => {
  const router = setup('/search?year=2000');

  await open();

  await userEvent.clear(screen.getByLabelText('Release Year'));
  await userEvent.type(screen.getByLabelText('Release Year'), '2024');

  await apply();
  await open();

  await act(async () => {
    await router.navigate(-1);
  });

  await closed();
  await open();

  expect(screen.getByLabelText('Release Year')).toHaveValue('2000');

  await act(async () => {
    await router.navigate(1);
  });

  await closed();
  await open();

  expect(screen.getByLabelText('Release Year')).toHaveValue('2024');
});

test('drawer traps keyboard focus, locks scrolling, dismisses via backdrop and restores focus', async () => {
  setup();
  const dialog = await open();
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(document.body.style.overflow).toBe('hidden');
  expect(dialog).toHaveFocus();

  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();
  await userEvent.tab();
  expect(
    screen.getByRole('button', { name: 'Close Filters & Sort' })
  ).toHaveFocus();
  await userEvent.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();

  fireEvent.click(
    screen.getByRole('button', { name: 'Dismiss Filters & Sort' })
  );
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

test('drawer stays modal and locked after viewport resize', async () => {
  setup();
  const background = screen.getByRole('button', { name: 'Outside' });
  const backgroundRoot = Array.from(document.body.children).find((node) =>
    node.contains(background)
  ) as HTMLElement;
  let backgroundIsInert = false;
  Object.defineProperty(backgroundRoot, 'inert', {
    configurable: true,
    get: () => backgroundIsInert,
    set: (value: boolean) => {
      backgroundIsInert = value;
    },
  });
  const dialog = await open();

  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(document.body.style.overflow).toBe('hidden');
  expect(backgroundRoot.inert).toBe(true);

  fireEvent(window, new Event('resize'));
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(document.body.style.overflow).toBe('hidden');
  expect(backgroundRoot.inert).toBe(true);

  await userEvent.keyboard('{Escape}');
  await closed();
});

test('unmounting the drawer restores prior scroll and background state', async () => {
  document.body.style.overflow = 'scroll';

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
    { initialEntries: ['/search'] }
  );
  const { container } = render(<RouterProvider router={router} />);
  let backgroundIsInert = false;
  Object.defineProperty(container, 'inert', {
    configurable: true,
    get: () => backgroundIsInert,
    set: (value: boolean) => {
      backgroundIsInert = value;
    },
  });

  await open();
  expect(document.body.style.overflow).toBe('hidden');
  expect(container.inert).toBe(true);

  cleanup();

  expect(document.body.style.overflow).toBe('scroll');
  expect(container.inert).toBe(false);
});
