import { fireEvent, render, screen } from '@testing-library/react';

import { ProductionCompanies } from './seriesPresentation';

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
