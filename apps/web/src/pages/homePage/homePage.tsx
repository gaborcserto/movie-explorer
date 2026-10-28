import { useParams } from 'react-router-dom';

import SearchResults from '../../components/list/searchResults';
import Details from '../../components/details';
import Search from '../../components/search';

function HomePage() {
  const { movieId } = useParams();

  return movieId ? (
    <Details />
  ) : (
    <main className="main" tabIndex={-1}>
      <Search />
      <SearchResults />
    </main>
  );
}

export default HomePage;
