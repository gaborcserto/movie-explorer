import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { i18n } from '../../../i18n';
import ErrorPresentation from '../../errorPresentation';
import { useSearchHistory } from '../../list/useSearchHistory';

export default function DetailError({
  heading,
  description,
  retry,
  pending = false,
}: {
  heading: string;
  description: string;
  retry?: () => void;
  pending?: boolean;
}) {
  useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  const history = useSearchHistory();
  const retryRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const button = retryRef.current;

    return () => {
      if (button && document.activeElement === button) {
        button.closest('main')?.focus({ preventScroll: true });
      }
    };
  }, []);

  const locked = useRef(false);

  useLayoutEffect(() => {
    if (!pending) {
      locked.current = false;
    }
  });

  return (
    <>
      <div role="status" className="visually-hidden">
        {pending ? i18n.t('ui.loading_information') : ''}
      </div>
      <div role="alert">
        <ErrorPresentation
          headingLevel={1}
          heading={heading}
          description={description}
          primaryAction={
            retry ? (
              <button
                ref={retryRef}
                type="button"
                className="btn btn--primary"
                aria-label={i18n.t('ui.try_again')}
                aria-disabled={pending}
                onClick={() => {
                  if (pending || locked.current) {
                    return;
                  }

                  locked.current = true;
                  retry();
                }}
              >
                {pending ? i18n.t('ui.trying_again') : i18n.t('ui.try_again')}
              </button>
            ) : null
          }
          secondaryAction={
            <Link
              className="btn btn--outline"
              to="/search"
              onClick={(event) => {
                // Only POP a transition observed inside this app instance. Direct entries
                // and modified clicks retain the ordinary, safe Search destination.
                if (
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey &&
                  !event.altKey &&
                  history?.detailOrigins.has(location.key)
                ) {
                  event.preventDefault();
                  navigate(-1);
                }
              }}
            >
              {i18n.t('ui.back_to_search')}
            </Link>
          }
        />
      </div>
    </>
  );
}
