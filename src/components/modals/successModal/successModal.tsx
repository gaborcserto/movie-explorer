import './successModal.scss';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

function SuccessModal() {
  const modalMessage = useSelector((state: RootState) => state.modal.message);

  return (
    <div className="modal__content modal__content--success">
      <div className="modal__icon success-icon">
        <div className="success-icon__inner" />
      </div>
      <div className="modal__header modal__header--success">
        Congratulations !
      </div>
      <div>{modalMessage}</div>
    </div>
  );
}

export default SuccessModal;
