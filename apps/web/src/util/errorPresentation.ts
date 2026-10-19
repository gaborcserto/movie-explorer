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
        heading: 'Invalid request',
        description: 'Please check your request and try again.',
      };
    case 'not-found':
      return {
        heading: 'Information not found',
        description: 'We could not find the requested information.',
      };
    case 'network':
      return {
        heading: 'Connection problem',
        description: "We couldn't connect to Movie Explorer. Please try again.",
      };
    case 'timeout':
      return {
        heading: 'Request timed out',
        description: 'The request took too long. Please try again.',
      };
    case 'rate-limited': {
      const delay =
        error instanceof ApiRequestError ? error.retryAfterSeconds : undefined;
      const guidance =
        delay && Number.isSafeInteger(delay) && delay > 0 && delay <= 86400
          ? ` Please wait about ${delay < 60 ? `${delay} seconds` : `${Math.ceil(delay / 60)} minutes`} before trying again.`
          : ' Please wait a moment before trying again.';
      return {
        heading: 'Please try again shortly',
        description: `Too many requests were made.${guidance}`,
      };
    }
    case 'service-unavailable':
      return {
        heading: 'Service temporarily unavailable',
        description: "Movie Explorer couldn't load this information right now.",
      };
    case 'invalid-response':
      return {
        heading: 'Unexpected response',
        description:
          "Movie Explorer couldn't read this information. Please try again.",
      };
    default:
      return {
        heading: 'Something went wrong',
        description: "We couldn't load this information. Please try again.",
      };
  }
}
