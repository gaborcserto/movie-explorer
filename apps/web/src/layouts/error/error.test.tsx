import { render } from '@testing-library/react';
import Error from './error';

describe('Error Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the provided error message', () => {
    const { getByText } = render(
      <Error message="Something went wrong!" className="error-class" />
    );

    expect(getByText('Something went wrong!')).toBeInTheDocument();
  });

  it('should have the provided className', () => {
    const { container } = render(
      <Error message="Something went wrong!" className="error-class" />
    );

    const sectionElement = container.firstChild as HTMLElement;
    expect(sectionElement).toHaveClass('error-class');
  });
});
