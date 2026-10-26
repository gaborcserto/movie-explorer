import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './footer';

test('shows JustWatch and OMDb attribution in the site footer', () => {
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
  expect(
    screen.getByRole('link', { name: 'OMDb / Brian Fritz' })
  ).toHaveAttribute('href', 'https://www.omdbapi.com/');
  expect(screen.getByRole('link', { name: 'CC BY-NC 4.0' })).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by-nc/4.0/'
  );
});
