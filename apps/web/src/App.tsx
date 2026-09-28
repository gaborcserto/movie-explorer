import './App.scss';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/homePage';
import ErrorPage from './pages/errorPage/errorPage';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Navigate to="/search" />} />
        <Route path="/search/:searchQuery" element={<HomePage />} />
        <Route path="/search" element={<HomePage />} />
        <Route path="/movie/:movieId" element={<HomePage />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </div>
  );
}

export default App;
