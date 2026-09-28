import { useDispatch } from 'react-redux';
import type { MovieMutationPayload } from '@movie-explorer/contracts';
import { postMovie } from '../../../util/apiUtils';
import {
  setModalType,
  setModalError,
  setModalLoading,
  setModalMessage,
} from '../../../reducer/modalSlice';
import Form from '../../form';
import { setHash } from '../../../reducer/moviesSlice';

function AddModal() {
  const dispatch = useDispatch();

  const handleAdd = async (data: MovieMutationPayload) => {
    dispatch(setModalLoading(true));

    postMovie(data)
      .then(() => {
        dispatch(setModalType('success'));
        dispatch(setModalMessage('Movie add successful'));
      })
      .catch((error) => {
        dispatch(setModalError(`Error: ${error.message}`));
      })
      .finally(() => {
        dispatch(setModalLoading(false));
        dispatch(setHash('#reload'));
      });
  };

  return <Form handleClick={handleAdd} title="Add Movie" />;
}

export default AddModal;
