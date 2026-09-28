import { render } from '@testing-library/react';
import SuccessModal from './successModal';

describe('<SuccessModal />', () => {
  it('should display the success message', () => {
    const { getByText } = render(<SuccessModal message="Success" />);

    expect(getByText('Success')).toBeInTheDocument();
  });
});
