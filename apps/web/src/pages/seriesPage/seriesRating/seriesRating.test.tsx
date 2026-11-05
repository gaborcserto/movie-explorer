import { render, screen } from '@testing-library/react';

import SeriesRating from './seriesRating';

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
