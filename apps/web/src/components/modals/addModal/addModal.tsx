import type { MovieMutationPayload } from '@movie-explorer/contracts';
import { postMovie } from '../../../util/apiUtils';
import Form from '../../form';

interface AddModalProps {
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

function AddModal({ onLoadingChange, onError, onSuccess }: AddModalProps) {
  const handleAdd = async (data: MovieMutationPayload) => {
    onLoadingChange(true);

    try {
      await postMovie(data);
      onSuccess('Movie add successful');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onError(`Error: ${message}`);
    } finally {
      onLoadingChange(false);
    }
  };

  return <Form onSubmit={handleAdd} title="Add Movie" />;
}

export default AddModal;
