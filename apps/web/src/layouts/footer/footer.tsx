import './footer.scss';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <Link to="/search" className="footer__title brand">
        <strong>Movie</strong> Explorer
      </Link>
    </footer>
  );
}

export default Footer;
