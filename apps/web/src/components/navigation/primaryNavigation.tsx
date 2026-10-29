import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  FaClapperboard,
  FaHouse,
  FaRegBookmark,
  FaTv,
  FaUsers,
} from 'react-icons/fa6';

import './primaryNavigation.scss';

type NavigationTarget = 'discover' | 'all' | 'movies' | 'tv' | 'people';
export type PrimaryNavigationMode = 'home' | 'results' | 'library';

const viewLabels: Record<NavigationTarget, string> = {
  discover: 'Home',
  all: 'All',
  movies: 'Movies',
  tv: 'Series',
  people: 'Persons',
};

export interface PrimaryNavigationProps {
  mode: PrimaryNavigationMode;
  activeView: string;
  query?: string;
}

export default function PrimaryNavigation({
  mode,
  activeView,
  query = '',
}: PrimaryNavigationProps) {
  const location = useLocation();
  const [params] = useSearchParams();
  const targets: readonly NavigationTarget[] =
    mode === 'results'
      ? ['all', 'movies', 'tv', 'people']
      : ['discover', 'movies', 'tv'];

  const targetTo = (target: NavigationTarget) => {
    if (target === 'discover') {
      return '/';
    }

    if (mode === 'library') {
      return `/?view=${target}`;
    }

    const next = new URLSearchParams(params);

    if (target === 'movies') {
      if (mode === 'home') {
        next.set('view', 'movies');
      } else {
        next.delete('view');
      }
    } else {
      next.set('view', target);
    }

    return { pathname: location.pathname, search: next.toString() };
  };

  return (
    <nav className="search-views" aria-label="Main navigation">
      {targets
        .filter((target) => mode !== 'results' || query || target !== 'all')
        .map((target) => (
          <Link
            key={target}
            to={targetTo(target)}
            aria-current={activeView === target ? 'page' : undefined}
          >
            {target === 'discover' && <FaHouse aria-hidden="true" />}
            {target === 'tv' && <FaTv aria-hidden="true" />}
            {target !== 'discover' &&
              target !== 'people' &&
              target !== 'tv' && <FaClapperboard aria-hidden="true" />}
            {target === 'people' && <FaUsers aria-hidden="true" />}
            {viewLabels[target]}
          </Link>
        ))}
      <Link
        className="search-views__library"
        to="/library"
        aria-current={activeView === 'library' ? 'page' : undefined}
      >
        <FaRegBookmark aria-hidden="true" />
        Library
      </Link>
    </nav>
  );
}
