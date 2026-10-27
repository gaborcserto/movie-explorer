import { render, screen } from '@testing-library/react';

import Skeleton, { SkeletonRegion } from './skeleton';
import { DetailHeroSkeleton, ResultsSkeleton } from './contentSkeletons';

test('hides individual shapes and announces a busy region once', () => {
  const { container } = render(
    <SkeletonRegion label="Loading results">
      <Skeleton width={64} height={64} circle />
      <Skeleton width="75%" height={24} radius={8} />
    </SkeletonRegion>
  );

  expect(screen.getByLabelText('Loading results')).toHaveAttribute(
    'aria-busy',
    'true'
  );
  expect(screen.getAllByRole('status')).toHaveLength(1);
  const shapes = container.querySelectorAll('.skeleton');
  expect(shapes[0]).toHaveStyle({
    width: '64px',
    height: '64px',
    borderRadius: '50%',
  });
  expect(shapes[1]).toHaveStyle({ width: '75%', borderRadius: '8px' });
  shapes.forEach((shape) =>
    expect(shape).toHaveAttribute('aria-hidden', 'true')
  );
  expect(container.querySelector('a, button, [tabindex]')).toBeNull();
});

test('reserves the existing poster and result-grid layouts until content replaces them', () => {
  const { container, rerender } = render(<DetailHeroSkeleton />);
  expect(
    container.querySelector('.movie-details__image.skeleton')
  ).not.toBeNull();
  expect(container.querySelector('.movie-details__content')).not.toBeNull();
  rerender(<ResultsSkeleton />);
  expect(
    container.querySelectorAll('.list__items .skeleton-card')
  ).toHaveLength(10);
  rerender(<h1>Ready</h1>);
  expect(screen.getByRole('heading', { name: 'Ready' })).toBeVisible();
  expect(screen.queryByRole('status')).toBeNull();
  expect(container.querySelector('.skeleton')).toBeNull();
});
