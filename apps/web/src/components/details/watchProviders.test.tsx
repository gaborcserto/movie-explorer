import { fireEvent, render, screen } from '@testing-library/react';
import WatchProviders from './watchProviders';

const provider = {
  id: 1,
  name: 'Netflix',
  category: 'streaming' as const,
  region: 'HU',
  logoUrl: 'https://image.tmdb.org/netflix.png',
  watchUrl: 'https://www.themoviedb.org/movie/1/watch',
};

test('renders available categories as non-interactive provider images', () => {
  render(
    <WatchProviders
      providers={[
        provider,
        { ...provider, id: 2, category: 'rent' },
        { ...provider, id: 3, category: 'buy' },
      ]}
    />
  );
  expect(screen.getByRole('heading', { name: 'Where to watch' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Streaming' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Rent' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Buy' })).toBeVisible();
  expect(
    screen.getByRole('img', { name: 'Netflix — Streaming' })
  ).toBeVisible();
  expect(screen.getByRole('img', { name: 'Netflix — Rent' })).toBeVisible();
  expect(screen.getByRole('img', { name: 'Netflix — Buy' })).toBeVisible();
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(document.querySelectorAll('.watch-providers a')).toHaveLength(0);
  expect(screen.queryByText(/JustWatch/)).toBeNull();
});

test.each([
  ['streaming', 'Streaming'],
  ['rent', 'Rent'],
  ['buy', 'Buy'],
] as const)('renders a %s-only category', (category, label) => {
  render(<WatchProviders providers={[{ ...provider, category }]} />);

  expect(screen.getByRole('heading', { name: label })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Where to watch' })).toBeVisible();
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
});

test('keeps category columns in place when an earlier category is empty', () => {
  const { container } = render(
    <WatchProviders providers={[{ ...provider, category: 'rent' }]} />
  );
  const categories = container.querySelector('.watch-providers__groups');

  expect(categories?.children).toHaveLength(3);
  expect(categories?.children[0]).toHaveClass('watch-providers__empty');
  expect(categories?.children[1]).toHaveClass('watch-providers__group');
  expect(categories?.children[2]).toHaveClass('watch-providers__empty');
  expect(screen.queryByRole('heading', { name: 'Streaming' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Rent' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Buy' })).toBeNull();
});

test('renders nothing when supported categories have no providers', () => {
  const { container } = render(<WatchProviders providers={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('falls back to the provider name when its logo fails', () => {
  render(<WatchProviders providers={[provider]} />);
  const image = screen.getByRole('img', { name: 'Netflix — Streaming' });
  expect(image).not.toBeNull();
  if (image) fireEvent.error(image);
  expect(
    screen.getByRole('img', { name: 'Netflix — Streaming' })
  ).toHaveTextContent('Netflix');
});

test('uses a local logo for a known provider ID and TMDB logos for others', () => {
  render(
    <WatchProviders
      providers={[
        { ...provider, id: 8 },
        { ...provider, id: 999, name: 'Other service' },
      ]}
    />
  );
  const images = screen.getAllByRole('img');
  expect(images[0]).toHaveAttribute(
    'src',
    expect.stringContaining('/providers/netflix.webp')
  );
  expect(images[1]).toHaveAttribute(
    'src',
    'https://image.tmdb.org/netflix.png'
  );
  expect(images[0]).toHaveAttribute('alt', 'Netflix — Streaming');
  expect(images[1]).toHaveAttribute('alt', 'Other service — Streaming');
});

test('uses Prime Video branding for distinct Amazon providers without merging categories', () => {
  render(
    <WatchProviders
      providers={[
        { ...provider, id: 9, name: 'Amazon Prime Video' },
        { ...provider, id: 10, name: 'Amazon Video', category: 'rent' },
        { ...provider, id: 10, name: 'Amazon Video', category: 'buy' },
      ]}
    />
  );

  [
    'Amazon Prime Video — Streaming',
    'Amazon Video — Rent',
    'Amazon Video — Buy',
  ].forEach((label) => {
    expect(screen.getByRole('img', { name: label })).toBeVisible();
  });
  const primeLogos = screen.getAllByRole('img');
  expect(primeLogos).toHaveLength(3);
  primeLogos.forEach((logo) => {
    expect(logo).toHaveAttribute(
      'src',
      expect.stringContaining('/providers/prime.webp')
    );
  });
});
