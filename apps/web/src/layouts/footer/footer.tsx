import './footer.scss';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <Link to="/search" className="footer__title brand">
        <strong>Movie</strong> Explorer
      </Link>
      <p className="footer__attribution">
        <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">
          JustWatch
        </a>
        {' · '}
        <a
          href="https://www.omdbapi.com/"
          target="_blank"
          rel="noreferrer"
          title="IMDb ratings supplied by OMDb / Brian Fritz; score and votes normalized for display"
        >
          OMDb / Brian Fritz
        </a>
        {' · '}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-NC 4.0
        </a>
      </p>
    </footer>
  );
}

export default Footer;
