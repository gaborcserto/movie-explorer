import { useParams } from 'react-router-dom';
import Search from '../../components/search';
import Details from '../../components/details';

interface HeaderProps {
  onAddMovie: () => void;
}

function Header({ onAddMovie }: HeaderProps) {
  const { movieId } = useParams();

  return movieId ? <Details /> : <Search onAddMovie={onAddMovie} />;
}

export default Header;
