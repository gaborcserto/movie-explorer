import { fireEvent, render, screen } from '@testing-library/react';

import { ProductionCompanies, SeriesRating } from './seriesPresentation';

test('shows production companies as text with an accessible expansion control', () => {
  render(
    <ProductionCompanies
      companies={[
        { id: 1, name: 'First Company' },
        { id: 2, name: 'Second Company' },
        { id: 3, name: 'Third Company' },
        { id: 4, name: 'Fourth Company with a Long Name' },
      ]}
    />
  );

  expect(
    screen.getByText(/First Company, Second Company, Third Company/)
  ).toBeVisible();
  expect(screen.queryByText(/Fourth Company/)).toBeNull();
  const toggle = screen.getByRole('button', { name: 'Show more' });
  fireEvent.click(toggle);

  expect(screen.getByText(/Fourth Company with a Long Name/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
});

test.each([null, 0, Number.NaN, Number.POSITIVE_INFINITY, -1, 10.1])(
  'does not present invalid TMDB episode rating %s',
  (rating) => {
    const { container } = render(<SeriesRating rating={rating} votes={0} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/votes/)).toBeNull();
  }
);

test('uses the shared rating presentation and omits a zero vote count', () => {
  render(<SeriesRating rating={8.2} votes={0} />);

  expect(
    screen.getByLabelText('TMDB rating: 8.2 out of 10')
  ).toBeInTheDocument();
  expect(screen.queryByText(/votes/)).toBeNull();
});
