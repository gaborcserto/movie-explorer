import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorPresentation from './errorPresentation';

test('supports a contextual service error without adding landmarks, focus, or announcements', async () => {
  const retry = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <main>
      <h1>Movie details</h1>
      <ErrorPresentation
        heading="Unable to reach Movie Explorer"
        description="We couldn't reach the service. Please try again."
        primaryAction={
          <button type="button" onClick={retry}>
            Try again
          </button>
        }
        secondaryAction={<a href="/search">Back to Search</a>}
      />
    </main>
  );

  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
    'Unable to reach Movie Explorer'
  );
  expect(
    screen.getByText("We couldn't reach the service. Please try again.")
  ).toBeVisible();
  expect(container.querySelector('[aria-live], [role="alert"]')).toBeNull();
  expect(screen.getByRole('button')).not.toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);

  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).toHaveAttribute('focusable', 'false');
  expect(svg).not.toHaveAttribute('tabindex');
  expect(screen.queryByRole('img')).toBeNull();
});

test('allows an alternative decorative illustration', () => {
  const { container } = render(
    <ErrorPresentation
      heading="Service unavailable"
      description="Please try again."
      illustration={<span>Decorative scene</span>}
      primaryAction={<button type="button">Try again</button>}
    />
  );

  expect(screen.getByText('Decorative scene').parentElement).toHaveAttribute(
    'aria-hidden',
    'true'
  );
  expect(container.querySelector('svg')).toBeNull();
});
