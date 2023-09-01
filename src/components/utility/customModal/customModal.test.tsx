import { render, fireEvent } from '@testing-library/react';
import {
  useSelector as originalUseSelector,
  useDispatch as originalUseDispatch,
} from 'react-redux';
import CustomModal from './customModal';

const useSelector = originalUseSelector as jest.Mock;
const useDispatch = originalUseDispatch as jest.Mock;

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockDispatch = jest.fn();

describe('<CustomModal />', () => {
  beforeEach(() => {
    useSelector.mockImplementation((callback) => {
      return callback({
        modal: {
          open: false,
          type: 'add',
          loading: false,
          error: false,
        },
      });
    });
    useDispatch.mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = render(<CustomModal />);
    expect(container).toMatchSnapshot();
  });

  it('displays the correct modal based on modal type delete', () => {
    useSelector.mockImplementation((callback) => {
      return callback({
        modal: {
          open: true,
          type: 'delete',
          loading: false,
          error: false,
        },
      });
    });

    const { queryByText } = render(<CustomModal />);

    expect(queryByText('Delete Movie')).toBeInTheDocument();
  });

  it('closes the modal when close button is clicked', () => {
    useSelector.mockImplementation((callback) => {
      return callback({
        modal: {
          open: true,
          type: 'add',
          loading: false,
          error: false,
        },
      });
    });

    const { getByText } = render(<CustomModal />);
    fireEvent.click(getByText('✖'));
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Object));
  });
});
