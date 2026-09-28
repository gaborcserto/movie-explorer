import type {
  MovieDetails,
  MovieMutationPayload,
} from '@movie-explorer/contracts';
import { putMovie } from '../../../util/apiUtils';
import Form from '../../form';

interface EditModalProps {
  movieData?: MovieDetails;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

function EditModal({
  movieData,
  onLoadingChange,
  onError,
  onSuccess,
}: EditModalProps) {
  const handleUpdate = async (data: MovieMutationPayload) => {
    onLoadingChange(true);

    try {
      await putMovie(data);
      onSuccess('Movie update successful');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onError(`Error: ${message}`);
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <Form onSubmit={handleUpdate} movieData={movieData} title="Edit Movie" />
  );
}

export default EditModal;
