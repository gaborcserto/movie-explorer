import { useParams } from 'react-router-dom';
import Footer from '../layouts/footer';
import Header from '../layouts/header';
import SearchResults from '../components/list/searchResults';

function HomePage() {
  const { movieId } = useParams();
  return (
    <>
      <Header />
      {movieId ? null : (
        <main className="main">
          <SearchResults />
        </main>
      )}
      <Footer />
    </>
  );
}

export default HomePage;
