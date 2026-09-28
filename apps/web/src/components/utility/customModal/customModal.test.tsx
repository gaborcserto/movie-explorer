import { render, fireEvent } from '@testing-library/react';
import type { MovieModalState } from '../../../types';
import CustomModal from './customModal';

const closedModalState: MovieModalState = {
  open: false,
  type: 'add',
  loading: false,
  error: false,
  movie: undefined,
  message: '',
};

const renderModal = (modalState: MovieModalState = closedModalState) => {
  const setModalState = vi.fn();
  const onClose = vi.fn();
  const onMoviesChanged = vi.fn();

  const view = render(
    <CustomModal
      modalState={modalState}
      setModalState={setModalState}
      onClose={onClose}
      onMoviesChanged={onMoviesChanged}
    />
  );

  return { ...view, setModalState, onClose, onMoviesChanged };
};

describe('<CustomModal />', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = renderModal();
    expect(container).toMatchSnapshot();
  });

  it('displays the correct modal based on modal type delete', () => {
    const { queryByText } = renderModal({
      ...closedModalState,
      open: true,
      type: 'delete',
    });

    expect(queryByText('Delete Movie')).toBeInTheDocument();
  });

  it('closes the modal when close button is clicked', () => {
    const { container, onClose } = renderModal({
      ...closedModalState,
      open: true,
    });
    const closeButton = container.querySelector('.modal__close');

    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when Escape is pressed', () => {
    const { onClose } = renderModal({
      ...closedModalState,
      open: true,
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
