import { Link, useLocation } from 'react-router-dom';
import HeaderSearch from '../../components/search/headerSearch';

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
        <Link to="/search" className="brand app-header__brand">
          <strong>Movie</strong>Explorer
        </Link>
        {(showSearch || showLibrarySearch) && <HeaderSearch />}
      </div>
    </header>
  );
}

export default Header;
