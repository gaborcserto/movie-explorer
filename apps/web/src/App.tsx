import './App.scss';
import { Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './pages/homePage';
import ErrorPage from './pages/errorPage/errorPage';

const routesConfig = [
  { path: '/', element: <Navigate to="/search" />, key: 'route-1' },
  { path: '/search/:searchQuery', element: <HomePage />, key: 'route-2' },
  { path: '/search', element: <HomePage />, key: 'route-3' },
  { path: '/movie/:movieId', element: <HomePage />, key: 'route-4' },
  { path: '*', element: <ErrorPage />, key: 'route-5' },
];

function App() {
  return (
    <div className="App">
      <Routes>
        {routesConfig.map((route) => (
          <Route key={route.key} path={route.path} element={route.element} />
        ))}
      </Routes>
    </div>
  );
}

export default App;
