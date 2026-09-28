import { createSlice } from '@reduxjs/toolkit';
import { Movie } from '../types';

interface InitialStateType {
  open: boolean;
  type: string;
  loading: boolean;
  // eslint-disable-next-line
  error: any | null;
  movie?: Movie;
  message: string;
}

const initialState: InitialStateType = {
  open: false,
  type: 'form',
  loading: false,
  error: null,
  movie: undefined,
  message: '',
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    setModalOpen: (state, action) => {
      state.open = action.payload;
    },
    setModalType: (state, action) => {
      state.type = action.payload;
    },
    setModalLoading: (state, action) => {
      state.loading = action.payload;
    },
    setModalError: (state, action) => {
      state.error = action.payload;
    },
    setModalMovie: (state, action) => {
      state.movie = action.payload;
    },
    setModalMessage: (state, action) => {
      state.message = action.payload;
    },
  },
});

export const {
  setModalOpen,
  setModalType,
  setModalLoading,
  setModalError,
  setModalMovie,
  setModalMessage,
} = modalSlice.actions;
export default modalSlice.reducer;
