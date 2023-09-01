import './loadingModal.scss';

const loadingModal = () => {
  return (
    <div className="modal__content modal__content--error">
      <div className="modal__header modal__header--loading">Loading</div>
      <div className="modal__content">
        <span className="loader" data-testid="loader-span" />
      </div>
    </div>
  );
};

export default loadingModal;
