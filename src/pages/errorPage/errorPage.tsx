import './errorPage.scss';

function ErrorPage() {
  return (
    <main className="main">
      <div className="error-page container">
        <h1 className="error-page__title">404 Error</h1>
        <h2 className="error-page__subtitle">Not Found</h2>
        <a className="error-page__link btn btn--primary" href="/">
          Back
        </a>
      </div>
    </main>
  );
}

export default ErrorPage;
