import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './footer';

test('shows JustWatch attribution in the site footer', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

  expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute(
    'href',
    'https://www.justwatch.com'
  );
});
