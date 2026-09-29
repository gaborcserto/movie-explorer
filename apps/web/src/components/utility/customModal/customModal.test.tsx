import { render, fireEvent, screen } from '@testing-library/react';
import CustomModal from './customModal';

const renderModal = (open = false) => {
  const onClose = vi.fn();

  const view = render(
    <CustomModal open={open} onClose={onClose} titleId="test-modal-title">
      <h2 id="test-modal-title">Test modal</h2>
    </CustomModal>
  );

  return { ...view, onClose };
};

describe('<CustomModal />', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = renderModal();
    expect(container).toMatchSnapshot();
  });

  it('renders reusable modal content when open', () => {
    renderModal(true);

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Test modal');
  });

  it('closes the modal when close button is clicked', () => {
    const { container, onClose } = renderModal(true);
    const closeButton = container.querySelector('.modal__close');

    expect(closeButton).not.toBeNull();
    fireEvent.click(closeButton as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when Escape is pressed', () => {
    const { onClose } = renderModal(true);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
