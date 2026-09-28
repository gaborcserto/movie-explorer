import './errorModal.scss';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';

function ErrorModal() {
  const errorMessage = useSelector((state: RootState) => state.modal.error);

  return (
    <div className="modal__content modal__content--error">
      <div className="modal__icon error-icon">
        <div className="error-icon__inner" />
      </div>
      <div className="modal__header modal__header--error">Error</div>
      <div className="modal__content">
        <p>{errorMessage}</p>
      </div>
    </div>
  );
}

export default ErrorModal;
