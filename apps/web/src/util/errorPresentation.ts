import { i18n } from '../i18n';
import { ApiRequestError } from './apiUtils';

export function isCancelledError(error: unknown) {
  return (
    (error instanceof ApiRequestError && error.category === 'cancelled') ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

export default function presentApiError(error: unknown) {
  const category =
    error instanceof ApiRequestError ? error.category : undefined;

  switch (category) {
    case 'cancelled':
      return null;
    case 'invalid-request':
      return {
        heading: i18n.t('ui.invalid_request'),
        description: i18n.t('ui.please_check_your_request_and_try_again'),
      };
    case 'not-found':
      return {
        heading: i18n.t('ui.information_not_found'),
        description: i18n.t('ui.we_could_not_find_the_requested_information'),
      };
    case 'network':
      return {
        heading: i18n.t('ui.connection_problem'),
        description: i18n.t(
          'ui.we_couldn_t_connect_to_movie_explorer_please_try_again'
        ),
      };
    case 'timeout':
      return {
        heading: i18n.t('ui.request_timed_out'),
        description: i18n.t('ui.the_request_took_too_long_please_try_again'),
      };
    case 'rate-limited': {
      const delay =
        error instanceof ApiRequestError ? error.retryAfterSeconds : undefined;
      let guidance = i18n.t('messages.waitMoment');

      if (delay && Number.isSafeInteger(delay) && delay > 0 && delay <= 86400) {
        guidance =
          delay < 60
            ? i18n.t('messages.waitSeconds', { count: delay })
            : i18n.t('messages.waitMinutes', { count: Math.ceil(delay / 60) });
      }

      return {
        heading: i18n.t('ui.please_try_again_shortly'),
        description: i18n.t('messages.rateLimited', { guidance }),
      };
    }
    case 'service-unavailable':
      return {
        heading: i18n.t('ui.service_temporarily_unavailable'),
        description: i18n.t(
          'ui.movie_explorer_couldn_t_load_this_information_right_now'
        ),
      };
    case 'invalid-response':
      return {
        heading: i18n.t('ui.unexpected_response'),
        description: i18n.t(
          'ui.movie_explorer_couldn_t_read_this_information_please_try_again'
        ),
      };
    default:
      return {
        heading: i18n.t('ui.something_went_wrong'),
        description: i18n.t(
          'ui.we_couldn_t_load_this_information_please_try_again'
        ),
      };
  }
}
