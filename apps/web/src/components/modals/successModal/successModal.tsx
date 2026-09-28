import './successModal.scss';

interface SuccessModalProps {
  message: string;
}

function SuccessModal({ message }: SuccessModalProps) {
  return (
    <div className="modal__content modal__content--success">
      <div className="modal__icon success-icon">
        <div className="success-icon__inner" />
      </div>
      <div className="modal__header modal__header--success">
        Congratulations !
      </div>
      <div>{message}</div>
    </div>
  );
}

export default SuccessModal;
