import { useLocation, useParams, useSearchParams } from 'react-router-dom';

import SearchResults from '../../components/list/searchResults';
import Details from '../../components/details';
import Search from '../../components/search';
import DiscoverPage from './discover';

function HomePage() {
  const { movieId } = useParams();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  if (movieId) {
    return <Details />;
  }

  const hasBrowseState =
    Boolean(searchParams.get('filter')) ||
    Boolean(searchParams.get('year')) ||
    Boolean(searchParams.get('rating')) ||
    Boolean(searchParams.get('page')) ||
    Boolean(
      searchParams.get('view') &&
      searchParams.get('view') !== 'movies' &&
      searchParams.get('view') !== 'discover'
    ) ||
    Boolean(
      searchParams.get('sorting') &&
      searchParams.get('sorting') !== 'popularity'
    ) ||
    Boolean(searchParams.get('order') && searchParams.get('order') !== 'desc');
  const showDiscovery =
    pathname === '/' &&
    (searchParams.get('view') === 'discover' ||
      (!hasBrowseState && !searchParams.has('view')));

  return (
    <main className="main" tabIndex={-1}>
      <Search />
      <SearchResults>{showDiscovery && <DiscoverPage />}</SearchResults>
    </main>
  );
}

export default HomePage;
