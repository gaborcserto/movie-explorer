import { useParams } from 'react-router-dom';
import Footer from '../layouts/footer';
import Header from '../layouts/header';
import Filter from '../components/filter';
import CardList from '../components/list/list';

function HomePage() {
  const { movieId } = useParams();
  return (
    <>
      <Header />
      <main className="main">
        {movieId ? null : (
          <>
            <Filter />
            <CardList />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default HomePage;
