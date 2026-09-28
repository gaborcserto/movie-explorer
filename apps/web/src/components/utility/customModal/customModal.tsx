import { useEffect } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
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
): movie is MovieDetails =>
  Boolean(movie && 'description' in movie && 'runtimeMinutes' in movie);

function CustomModal({
  modalState,
  setModalState,
  onClose,
  onMoviesChanged,
}: CustomModalProps) {
  const { open, type, loading, error, movie, message } = modalState;

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

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

  let content: ReactNode;

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
    case 'add':
      content = (
        <AddModal
          onLoadingChange={setLoading}
          onError={setError}
          onSuccess={setSuccess}
        />
      );
      break;
    default:
      content = null;
  }

  if (error) content = <ErrorModal message={error} />;
  if (loading) content = <LoadingModal />;

  return open ? (
    <div className="modal__overlay">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          onClick={onClose}
          className="modal__close"
          type="button"
          aria-label="Close dialog"
        >
          <span className="visually-hidden">Close dialog</span>
        </button>
        {content}
      </section>
    </div>
  ) : null;
}

export default CustomModal;
