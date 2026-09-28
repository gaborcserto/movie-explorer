import axios from 'axios';
import { MovieData, URLParams } from '../types';

const URL = `http://localhost:4000/movies/`;

export const postMovie = (data: MovieData) => {
  return axios.post(URL, data);
};

export const deleteMovie = (id: number) => {
  return axios.delete(URL + id);
};

export const putMovie = (data: MovieData) => {
  return axios.put(URL, data);
};

export const getMovie = (id: number) => {
  const currentUrl = URL + id;
  return axios.get(currentUrl);
};

export const sortParams = (data: string | undefined | null) => {
  return data ? data.replace(/[ +]/g, '_').toLowerCase() : 'title';
};

const searchParams = (data: string | undefined) => {
  return data ?? '';
};

export const getMovies = (urlParams: URLParams) => {
  return axios.get(URL, {
    params: {
      search: searchParams(urlParams.search),
      searchBy: 'title',
      sortBy: sortParams(urlParams.sort),
      sortOrder: 'asc',
      filter: urlParams.genres,
      hash: urlParams.hash,
    },
  });
};
