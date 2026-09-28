import './loadingModal.scss';

function LoadingModal() {
  return (
    <div className="modal__content modal__content--error">
      <h2 className="modal__header modal__header--loading" id="modal-title">
        Loading
      </h2>
      <div className="modal__content">
        <span className="loader" data-testid="loader-span" />
      </div>
    </div>
  );
}

export default LoadingModal;
