import type { Dispatch, SetStateAction } from 'react';
import type { MovieDetails } from '@movie-explorer/contracts';
import './customModal.scss';
import AddModal from '../../modals/addModal';
import EditModal from '../../modals/editModal';
import DeleteModal from '../../modals/deleteModal';
import SuccessModal from '../../modals/successModal';
import ErrorModal from '../../modals/errorModal';
import LoadingModal from '../../modals/loadingModal';
import type { MovieModalState } from '../../../types';

interface CustomModalProps {
  modalState: MovieModalState;
  setModalState: Dispatch<SetStateAction<MovieModalState>>;
  onClose: () => void;
  onMoviesChanged: () => void;
}

const isMovieDetails = (
  movie: MovieModalState['movie']
): movie is MovieDetails => {
  return Boolean(movie && 'description' in movie && 'runtimeMinutes' in movie);
};

function CustomModal({
  modalState,
  setModalState,
  onClose,
  onMoviesChanged,
}: CustomModalProps) {
  const { open, type, loading, error, movie, message } = modalState;

  const closeModal = () => {
    onClose();
  };

  const setLoading = (nextLoading: boolean) => {
    setModalState((currentState) => ({
      ...currentState,
      loading: nextLoading,
    }));
  };

  const setError = (nextError: string) => {
    setModalState((currentState) => ({
      ...currentState,
      loading: false,
      error: nextError,
    }));
  };

  const setSuccess = (nextMessage: string) => {
    setModalState((currentState) => ({
      ...currentState,
      type: 'success',
      loading: false,
      message: nextMessage,
    }));
    onMoviesChanged();
  };

  let content = (
    <AddModal
      onLoadingChange={setLoading}
      onError={setError}
      onSuccess={setSuccess}
    />
  );

  switch (type) {
    case 'delete':
      content = (
        <DeleteModal
          movieData={movie}
          onLoadingChange={setLoading}
          onError={setError}
          onSuccess={setSuccess}
        />
      );
      break;
    case 'success':
      content = <SuccessModal message={message} />;
      break;
    case 'add':
      content = (
        <AddModal
          onLoadingChange={setLoading}
          onError={setError}
          onSuccess={setSuccess}
        />
      );
      break;
    case 'edit':
      content = (
        <EditModal
          movieData={isMovieDetails(movie) ? movie : undefined}
          onLoadingChange={setLoading}
          onError={setError}
          onSuccess={setSuccess}
        />
      );
      break;
    default:
      break;
  }

  if (error) content = <ErrorModal message={error} />;
  if (loading) content = <LoadingModal />;

  return open ? (
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
