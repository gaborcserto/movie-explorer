import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from '.';

interface MockProps {
  shouldThrow: boolean;
  message: string;
}

function MockComponent({ shouldThrow, message }: MockProps) {
  if (shouldThrow) {
    throw new Error(message);
  }

  return <div>{message}</div>;
}

describe('<ErrorBoundary />', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    vi.mocked(console.error).mockRestore();
  });

  it('should catch errors and display the fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <MockComponent shouldThrow message="Test error" />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeInTheDocument();
    expect(
      getByText('An unexpected error interrupted this scene.')
    ).toBeVisible();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveFocus();
    expect(document.title).toBe('Something went wrong | Movie Explorer');
    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // No Router is present: recovery must work outside the failed tree.
    expect(
      screen.getByRole('link', { name: 'Back to Search' })
    ).toHaveAttribute('href', '/search');
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledWith(
      'Uncaught error:',
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );

    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should render children if there are no errors', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <MockComponent shouldThrow={false} message="Everything is fine" />
      </ErrorBoundary>
    );

    expect(getByText('Everything is fine')).toBeInTheDocument();
  });
});
