import Footer from '../layouts/footer';
import CustomModal from '../components/utility/customModal';
import Header from '../layouts/header';
import Filter from '../components/filter';
import CardList from '../components/list/list';

function HomePage() {
  return (
    <>
      <Header />
      <main className="main">
        <Filter />
        <CardList />
      </main>
      <Footer />
      <CustomModal />
    </>
  );
}

export default HomePage;
