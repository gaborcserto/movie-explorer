import { useState, useEffect } from 'react';
import './customModal.scss';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import {
  setModalOpen,
  setModalError,
  setModalLoading,
} from '../../../reducer/modalSlice';
import AddModal from '../../modals/addModal';
import EditModal from '../../modals/editModal';
import DeleteModal from '../../modals/deleteModal';
import SuccessModal from '../../modals/successModal';
import ErrorModal from '../../modals/errorModal';
import LoadingModal from '../../modals/loadingModal';
import { setHash } from '../../../reducer/moviesSlice';

function CustomModal() {
  const modalOpen = useSelector((state: RootState) => state.modal.open);
  const modalType = useSelector((state: RootState) => state.modal.type);
  const modalLoading = useSelector((state: RootState) => state.modal.loading);
  const modalError = useSelector((state: RootState) => state.modal.error);

  const [isModalOpen, setIsModalOpen] = useState(modalOpen);
  const [isModalType, setIsModalType] = useState(modalType);
  const [isModalLoading, setIsModalLoading] = useState(modalLoading);
  const [isModalError, setIsModalError] = useState(modalError);

  const dispatch = useDispatch();

  const closeModal = () => {
    setIsModalOpen(false);
    dispatch(setModalOpen(false));
    dispatch(setModalError(false));
    dispatch(setModalLoading(false));
    dispatch(setHash('#reload'));
  };

  useEffect(() => {
    setIsModalOpen(modalOpen);
    setIsModalType(modalType);
    setIsModalError(modalError);
    setIsModalLoading(modalLoading);
  }, [modalOpen, modalType, modalError, modalLoading]);

  let content = <AddModal />;

  switch (isModalType) {
    case 'delete':
      content = <DeleteModal />;
      break;
    case 'success':
      content = <SuccessModal />;
      break;
    case 'add':
      content = <AddModal />;
      break;
    case 'edit':
      content = <EditModal />;
      break;
    default:
      content = <AddModal />;
      break;
  }

  if (isModalError) content = <ErrorModal />;
  if (isModalLoading) content = <LoadingModal />;

  return isModalOpen ? (
    <div className="modal__overlay">
      <section className="modal">
        <button onClick={closeModal} className="modal__close" type="button">
          ✖
        </button>
        {content}
      </section>
    </div>
  ) : null;
}

export default CustomModal;
