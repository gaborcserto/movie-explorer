import { useTranslation } from 'react-i18next';

import './errorPage.scss';
import { Link } from 'react-router';

import { i18n } from '../../i18n';
import ErrorPresentation from '../../components/errorPresentation';
import useDetailPage from '../../hooks/useDetailPage';

function ErrorPage() {
  useTranslation();

  const mainRef = useDetailPage(i18n.t('ui.page_not_found'));

  return (
    <main
      className="main error-page"
      ref={mainRef}
      tabIndex={-1}
      aria-label={i18n.t('ui.page_not_found')}
    >
      <ErrorPresentation
        variant="page"
        headingLevel={1}
        status="404"
        heading={i18n.t('ui.page_not_found')}
        description={i18n.t('ui.looks_like_this_scene_is_missing')}
        primaryAction={
          <Link className="btn btn--primary" to="/search">
            {i18n.t('ui.back_to_search')}
          </Link>
        }
      />
    </main>
  );
}

export default ErrorPage;
