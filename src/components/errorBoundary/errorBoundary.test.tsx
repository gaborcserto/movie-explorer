import { render } from '@testing-library/react';
import ErrorBoundary from './errorBoundary';

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    (console.error as jest.Mock).mockRestore();
  });

  it('should catch errors and display the fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <MockComponent shouldThrow message="Test error" />
      </ErrorBoundary>
    );

    expect(getByText('⚠️ Sorry.. there was an error ⚠️')).toBeInTheDocument();
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
