import { useTranslation } from 'react-i18next';
import './footer.scss';

import { Link } from 'react-router';

import { i18n } from '../../i18n';

function Footer() {
  useTranslation();

  return (
    <footer className="footer">
      <Link to="/search" className="footer__title brand">
        <strong>Movie</strong>Explorer
      </Link>
      <p className="footer__attribution">
        <a
          className="text-link"
          href="https://www.justwatch.com"
          target="_blank"
          rel="noreferrer"
        >
          JustWatch
        </a>
        {' · '}
        <a
          className="text-link"
          href="https://www.omdbapi.com/"
          target="_blank"
          rel="noreferrer"
          title={i18n.t('messages.attribution')}
        >
          OMDb / Brian Fritz
        </a>
        {' · '}
        <a
          className="text-link"
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
