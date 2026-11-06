import { Link, useLocation } from 'react-router';

import HeaderSearch from '../../components/search/headerSearch';
import PreferencesControls from '../../features/preferences/preferencesControls';

function Header() {
  const { pathname } = useLocation();
  const showSearch = /^\/(movie|series|person|tv)\//.test(pathname);
  const showLibrarySearch = pathname === '/library';
  const isSearchPage =
    pathname === '/' ||
    pathname === '/search' ||
    pathname.startsWith('/search/');

  return (
    <header
      className={`app-header${isSearchPage ? ' app-header--search' : ''}`}
    >
      <div className="app-header__inner container">
        <Link to="/" className="brand app-header__brand">
          <strong>Movie</strong>Explorer
        </Link>
        <div className="app-header__actions">
          {(showSearch || showLibrarySearch) && <HeaderSearch />}
          <PreferencesControls />
        </div>
      </div>
    </header>
  );
}

export default Header;
