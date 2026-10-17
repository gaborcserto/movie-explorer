import './App.scss';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homePage';
import ErrorPage from './pages/errorPage/errorPage';
import PersonPage from './pages/personPage/personPage';
import SearchHistoryProvider from './components/list/searchHistory';

function App() {
  return (
    <SearchHistoryProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/search" />} />
          <Route path="/search/:searchQuery" element={<HomePage />} />
          <Route path="/search" element={<HomePage />} />
          <Route path="/movie/:movieId" element={<HomePage />} />
          <Route path="/person/:id" element={<PersonPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </SearchHistoryProvider>
  );
}

export default App;
