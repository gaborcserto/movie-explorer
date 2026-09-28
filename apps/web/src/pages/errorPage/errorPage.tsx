import './errorPage.scss';
import { Link } from 'react-router-dom';

function ErrorPage() {
  return (
    <main className="main">
      <div className="error-page container">
        <h1 className="error-page__title">404 Error</h1>
        <h2 className="error-page__subtitle">Not Found</h2>
        <Link className="error-page__link btn btn--primary" to="/search">
          Back
        </Link>
      </div>
    </main>
  );
}

export default ErrorPage;
