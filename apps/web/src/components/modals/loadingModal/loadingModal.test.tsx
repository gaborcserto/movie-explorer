import { render } from '@testing-library/react';
import LoadingModal from './loadingModal';

describe('<LoadingModal />', () => {
  it('should render the loading modal', () => {
    const { getByText, getByTestId } = render(<LoadingModal />);

    expect(getByText('Loading')).toBeInTheDocument();

    const loaderSpan = getByTestId('loader-span');
    expect(loaderSpan).toBeInTheDocument();
  });
});
