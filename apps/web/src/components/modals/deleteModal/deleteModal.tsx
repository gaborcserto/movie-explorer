import './deleteModal.scss';
import { useSelector, useDispatch } from 'react-redux';
import { deleteMovie } from '../../../util/apiUtils';
import { RootState } from '../../../store/store';
import {
  setModalError,
  setModalLoading,
  setModalType,
  setModalMessage,
} from '../../../reducer/modalSlice';
import { setHash } from '../../../reducer/moviesSlice';

function DeleteModal() {
  const modalData = useSelector((state: RootState) => state.modal.movie);
  const dispatch = useDispatch();

  const handleDelete = async (id: number) => {
    try {
      await deleteMovie(id);
      dispatch(setModalLoading(false));
      dispatch(setModalType('success'));
      dispatch(setModalMessage('Delete Successful'));
      dispatch(setHash('#reload'));
      // eslint-disable-next-line
    } catch (error: any) {
      dispatch(setModalLoading(false));
      dispatch(setModalError(`Error: ${error.message}`));
    }
  };

  const handleConfirm = () => {
    if (modalData) {
      dispatch(setModalLoading(true));
      handleDelete(modalData.id).then();
    }
  };

  return (
    <div className="modal__content modal__content--delete">
      <div className="modal__header">Delete Movie</div>
      <div>Are you sure you want to delete this movie?</div>
      <div className="modal__footer">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default DeleteModal;
