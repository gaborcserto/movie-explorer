import { useDispatch, useSelector } from 'react-redux';
import { putMovie } from '../../../util/apiUtils';
import { RootState } from '../../../store/store';
import {
  setModalType,
  setModalError,
  setModalLoading,
  setModalMessage,
} from '../../../reducer/modalSlice';
import { MovieData } from '../../../types';
import { setHash } from '../../../reducer/moviesSlice';
import Form from '../../form';

function EditModal() {
  const movieData = useSelector((state: RootState) => state.modal.movie);
  const dispatch = useDispatch();

  const handleUpdate = async (data: MovieData) => {
    dispatch(setModalLoading(true));

    putMovie(data)
      .then(() => {
        dispatch(setModalType('success'));
        dispatch(setModalMessage('Movie update successful'));
      })
      .catch((error) => {
        dispatch(setModalError(`Error: ${error.message}`));
      })
      .finally(() => {
        dispatch(setModalLoading(false));
        dispatch(setHash('#reload'));
      });
  };

  return (
    <Form handleClick={handleUpdate} movieData={movieData} title="Edit Movie" />
  );
}

export default EditModal;
