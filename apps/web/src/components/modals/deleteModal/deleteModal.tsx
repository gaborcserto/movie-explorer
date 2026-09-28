import './deleteModal.scss';
import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';
import { deleteMovie } from '../../../util/apiUtils';

interface DeleteModalProps {
  movieData?: MovieDetails | MovieSummary;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

function DeleteModal({
  movieData,
  onLoadingChange,
  onError,
  onSuccess,
}: DeleteModalProps) {
  const handleConfirm = async () => {
    if (!movieData) return;

    onLoadingChange(true);

    try {
      await deleteMovie(movieData.id);
      onSuccess('Delete Successful');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onError(`Error: ${message}`);
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <div className="modal__content modal__content--delete">
      <h2 className="modal__header" id="modal-title">
        Delete Movie
      </h2>
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
