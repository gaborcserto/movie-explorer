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

    postMovie(data)
      .then(() => {
        onSuccess('Movie add successful');
      })
      .catch((error) => {
        onError(`Error: ${error.message}`);
      })
      .finally(() => {
        onLoadingChange(false);
      });
  };

  return <Form handleClick={handleAdd} title="Add Movie" />;
}

export default AddModal;
