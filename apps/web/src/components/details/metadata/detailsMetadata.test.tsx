import { render, screen } from '@testing-library/react';
import DetailsMetadata from './detailsMetadata';

test('keeps the Movie metadata class by default', () => {
  const { container } = render(
    <DetailsMetadata entries={[['Status', 'Released']]} />
  );

  expect(container.querySelector('dl')).toHaveClass('movie-details__metadata');
  expect(screen.getByText('Released')).toBeVisible();
});

test('supports page-specific metadata styling and semantic values', () => {
  render(
    <DetailsMetadata
      className="person-profile__metadata"
      entries={[
        ['Birthday', <time dateTime="2000-01-02">2000-01-02</time>],
        ['Age', 0],
      ]}
    />
  );

  expect(screen.getByText('2000-01-02')).toHaveAttribute(
    'datetime',
    '2000-01-02'
  );
  expect(screen.getByText('Age').nextElementSibling).toHaveTextContent('0');
  expect(document.querySelector('dl')).toHaveClass('person-profile__metadata');
});
