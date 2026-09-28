import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders learn react link', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  const linkElement = screen.getByText(/add movie/i);
  expect(linkElement).toBeInTheDocument();
});

test('displays the 404 error page for non-existent routes', () => {
  window.history.pushState({}, '', '/non-existent-route');

  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  expect(screen.getByText('404 Error')).toBeInTheDocument();
});
