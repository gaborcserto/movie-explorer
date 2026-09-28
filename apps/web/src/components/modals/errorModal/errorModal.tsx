import './errorModal.scss';

interface ErrorModalProps {
  message: string;
}

function ErrorModal({ message }: ErrorModalProps) {
  return (
    <div className="modal__content modal__content--error">
      <div className="modal__icon error-icon">
        <div className="error-icon__inner" />
      </div>
      <h2 className="modal__header modal__header--error" id="modal-title">
        Error
      </h2>
      <div className="modal__content">
        <p>{message}</p>
      </div>
    </div>
  );
}

export default ErrorModal;
