import { createSlice } from '@reduxjs/toolkit';

type InitialStateType = {
  search: string;
  hash: string;
};

const initialState: InitialStateType = {
  search: '',
  hash: '#loaded',
};

export const moviesSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    setMoviesSearch: (state, action) => {
      state.search = action.payload;
    },
    setHash: (state, action) => {
      state.hash = action.payload;
    },
  },
});

export const { setMoviesSearch, setHash } = moviesSlice.actions;
export default moviesSlice.reducer;
