import { useParams } from 'react-router-dom';
import Search from '../../components/search';
import Details from '../../components/details';

function Header() {
  const { movieId } = useParams();

  return movieId ? <Details /> : <Search />;
}

export default Header;
