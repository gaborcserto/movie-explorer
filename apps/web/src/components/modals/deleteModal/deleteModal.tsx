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
  const handleDelete = async (id: number) => {
    try {
      await deleteMovie(id);
      onLoadingChange(false);
      onSuccess('Delete Successful');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      onLoadingChange(false);
      onError(`Error: ${message}`);
    }
  };

  const handleConfirm = () => {
    if (movieData) {
      onLoadingChange(true);
      handleDelete(movieData.id).then();
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
