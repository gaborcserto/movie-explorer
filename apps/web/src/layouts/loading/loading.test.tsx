import { render, screen } from '@testing-library/react';

import Loading from './loading';

test('keeps route loading inside the shared hero and main landmark', () => {
  const { container } = render(
    <Loading className="main route-loading" title="Loading series" />
  );

  expect(screen.getByRole('main')).toHaveClass('main', 'route-loading');
  expect(screen.getByRole('status')).toHaveTextContent('Loading series');
  expect(container.querySelector('.page-hero')).toBeInTheDocument();
  expect(
    container.querySelector('.movie-details.container')
  ).toBeInTheDocument();
});
