import { configureStore } from '@reduxjs/toolkit';
import moviesReducer from '../reducer/moviesSlice';
import modalReducer from '../reducer/modalSlice';

const rootReducer = {
  movies: moviesReducer,
  modal: modalReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    movies: {
      search: '',
      hash: '#loaded',
    },
    modal: {
      open: false,
      type: 'form',
      loading: false,
      error: null,
      movie: undefined,
      message: '',
    },
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
