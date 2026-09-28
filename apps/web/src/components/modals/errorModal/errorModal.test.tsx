import { render } from '@testing-library/react';
import ErrorModal from './errorModal';

describe('<ErrorModal />', () => {
  it('should display the error message', () => {
    const { getByText } = render(<ErrorModal message="Sample error message" />);

    expect(getByText('Sample error message')).toBeInTheDocument();
  });
});
