import { useState } from 'react';
import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';
import Footer from '../layouts/footer';
import CustomModal from '../components/utility/customModal';
import Header from '../layouts/header';
import Filter from '../components/filter';
import CardList from '../components/list/list';
import type { MovieModalState } from '../types';

const initialModalState: MovieModalState = {
  open: false,
  type: 'add',
  loading: false,
  error: null,
  movie: undefined,
  message: '',
};

function HomePage() {
  const [modalState, setModalState] =
    useState<MovieModalState>(initialModalState);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshMovies = () => {
    setRefreshKey((currentKey) => currentKey + 1);
  };

  const openAddMovieModal = () => {
    setModalState({
      ...initialModalState,
      open: true,
      type: 'add',
    });
  };

  const openEditMovieModal = (movie: MovieDetails) => {
    setModalState({
      ...initialModalState,
      open: true,
      type: 'edit',
      movie,
    });
  };

  const openDeleteMovieModal = (movie: MovieSummary) => {
    setModalState({
      ...initialModalState,
      open: true,
      type: 'delete',
      movie,
    });
  };

  const showModalError = (error: string) => {
    setModalState((currentState) => ({
      ...currentState,
      open: true,
      loading: false,
      error,
    }));
  };

  const closeModal = () => {
    setModalState(initialModalState);
  };

  return (
    <>
      <Header onAddMovie={openAddMovieModal} />
      <main className="main">
        <Filter />
        <CardList
          refreshKey={refreshKey}
          onEditMovie={openEditMovieModal}
          onDeleteMovie={openDeleteMovieModal}
          onMovieActionError={showModalError}
        />
      </main>
      <Footer />
      <CustomModal
        modalState={modalState}
        setModalState={setModalState}
        onClose={closeModal}
        onMoviesChanged={refreshMovies}
      />
    </>
  );
}

export default HomePage;
