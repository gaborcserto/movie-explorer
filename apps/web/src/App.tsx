import './App.scss';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homePage';
import ErrorPage from './pages/errorPage/errorPage';
import SearchHistoryProvider from './components/list/searchHistory';
import Loading from './layouts/loading';

const PersonPage = lazy(() => import('./pages/personPage/personPage'));

function App() {
  return (
    <SearchHistoryProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/search" />} />
          <Route path="/search/:searchQuery" element={<HomePage />} />
          <Route path="/search" element={<HomePage />} />
          <Route path="/movie/:movieId" element={<HomePage />} />
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
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </SearchHistoryProvider>
  );
}

export default App;
