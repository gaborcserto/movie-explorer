import './errorPage.scss';
import { Link } from 'react-router-dom';
import ErrorPresentation from '../../components/errorPresentation';
import useDetailPage from '../../components/details/hooks';

function ErrorPage() {
  const mainRef = useDetailPage('Page not found');

  return (
    <main
      className="main error-page"
      ref={mainRef}
      tabIndex={-1}
      aria-label="Page not found"
    >
      <ErrorPresentation
        variant="page"
        headingLevel={1}
        status="404"
        heading="Page not found"
        description="Looks like this scene is missing."
        primaryAction={
          <Link className="btn btn--primary" to="/search">
            Back to Search
          </Link>
        }
      />
    </main>
  );
}

export default ErrorPage;
