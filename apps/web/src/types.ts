import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';

export interface URLParams {
  sort?: string | null;
  search?: string;
  genres?: string | null;
}

export type ModalType = 'add' | 'edit' | 'delete' | 'success';

export interface MovieModalState {
  open: boolean;
  type: ModalType;
  loading: boolean;
  error: string | false | null;
  movie?: MovieDetails | MovieSummary;
  message: string;
}
