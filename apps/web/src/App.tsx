import './App.scss';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/homePage';
import ErrorPage from './pages/errorPage/errorPage';
import SearchHistoryProvider from './components/list/searchHistory';
import Loading from './layouts/loading';
import Header from './layouts/header';
import Footer from './layouts/footer';
import ErrorBoundary from './components/errorBoundary';
import LibraryPage from './pages/libraryPage';
import PersistenceNotice from './features/library/persistenceNotice';
import RouteMetadata from './components/routeMetadata';

const PersonPage = lazy(() => import('./pages/personPage/personPage'));
const SeriesPage = lazy(() => import('./pages/seriesPage'));
const SeasonPage = lazy(() => import('./pages/seriesPage/seasonPage'));
const EpisodePage = lazy(() => import('./pages/seriesPage/episodePage'));

function LegacySeriesRedirect() {
  const location = useLocation();

  return (
    <Navigate
      to={{
        pathname: location.pathname.replace(/^\/tv(?=\/)/, '/series'),
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  );
}

function SiteLayout() {
  const { pathname } = useLocation();
  const isSearchRoute =
    pathname === '/' ||
    pathname === '/search' ||
    pathname.startsWith('/search/');
  const isDetailRoute = /^\/(movie|series|person)\//.test(pathname);
  const isLibraryRoute = pathname === '/library';
  const appClassName = `App${isSearchRoute ? ' App--search' : ''}${
    isDetailRoute ? ' App--details' : ''
  }${isLibraryRoute ? ' App--library' : ''}`;

  return (
    <div className={appClassName}>
      <Header />
      <PersistenceNotice />
      <Outlet />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <RouteMetadata />
      <SearchHistoryProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search/:searchQuery" element={<HomePage />} />
            <Route path="/search" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/movie/:movieId" element={<HomePage />} />
            <Route
              path="/series/:id"
              element={
                <Suspense
                  fallback={
                    <Loading
                      className="main route-loading"
                      title="Loading series"
                    />
                  }
                >
                  <SeriesPage />
                </Suspense>
              }
            />
            <Route
              path="/series/:id/seasons/:seasonNumber"
              element={
                <Suspense
                  fallback={
                    <Loading
                      className="main route-loading"
                      title="Loading season"
                    />
                  }
                >
                  <SeasonPage />
                </Suspense>
              }
            />
            <Route
              path="/series/:id/seasons/:seasonNumber/episodes/:episodeNumber"
              element={
                <Suspense
                  fallback={
                    <Loading
                      className="main route-loading"
                      title="Loading episode"
                    />
                  }
                >
                  <EpisodePage />
                </Suspense>
              }
            />
            <Route path="/tv/:id" element={<LegacySeriesRedirect />} />
            <Route
              path="/tv/:id/seasons/:seasonNumber"
              element={<LegacySeriesRedirect />}
            />
            <Route
              path="/tv/:id/seasons/:seasonNumber/episodes/:episodeNumber"
              element={<LegacySeriesRedirect />}
            />
            <Route
              path="/person/:id"
              element={
                <Suspense
                  fallback={
                    <Loading
                      className="main route-loading"
                      title="Loading person"
                    />
                  }
                >
                  <PersonPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </SearchHistoryProvider>
    </ErrorBoundary>
  );
}

export default App;
