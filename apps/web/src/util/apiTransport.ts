import usePreferencesStore from '../features/preferences/preferencesStore';
import {
  ApiRequestError,
  API_REQUEST_TIMEOUT_MS,
  classifyHttpStatus,
} from './apiErrors';

const activeRequests = new Set<AbortController>();
usePreferencesStore.subscribe((state, previous) => {
  if (state.preferences !== previous.preferences) {
    activeRequests.forEach((controller) => controller.abort('cancelled'));
  }
});

async function request<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = API_REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const { language, region } = usePreferencesStore.getState().preferences;
  const localizationParams = new URLSearchParams();

  if (language !== 'en-US') {
    localizationParams.set('language', language);
  }
  if (region !== 'US') {
    localizationParams.set('watchRegion', region);
  }

  const localizedUrl = localizationParams.size
    ? `${url}${url.includes('?') ? '&' : '?'}${localizationParams}`
    : url;

  // Numeric rating outcomes are language/region-neutral and can finish in place.
  if (!/\/ratings(?:\?|$)/.test(url)) {
    activeRequests.add(controller);
  }
  const callerSignal = init.signal;

  const cancel = () => {
    if (!controller.signal.aborted) {
      controller.abort('cancelled');
    }
  };

  if (callerSignal?.aborted) {
    cancel();
  } else {
    callerSignal?.addEventListener('abort', cancel, { once: true });
  }

  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort('timeout');
    }
  }, timeoutMs);
  let status: number | undefined;

  try {
    controller.signal.throwIfAborted();

    const response = await fetch(localizedUrl, {
      ...init,
      signal: controller.signal,
    });
    status = response.status;
    controller.signal.throwIfAborted();

    if (!response.ok) {
      const delay = response.headers?.get('Retry-After');
      const seconds = delay && /^\d+$/.test(delay) ? Number(delay) : undefined;
      const retryAfterSeconds =
        status === 429 &&
        seconds !== undefined &&
        Number.isSafeInteger(seconds) &&
        seconds > 0 &&
        seconds <= 86_400
          ? seconds
          : undefined;
      throw new ApiRequestError(
        classifyHttpStatus(status),
        status,
        retryAfterSeconds
      );
    }

    try {
      const body: unknown = await response.json();
      controller.signal.throwIfAborted();

      return body as T;
    } catch {
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }

      throw new ApiRequestError('invalid-response', status);
    }
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new ApiRequestError(
        controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled',
        status
      );
    }

    if (error instanceof ApiRequestError) {
      throw error;
    }

    throw new ApiRequestError('network', status);
  } finally {
    activeRequests.delete(controller);
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', cancel);
    // Release any unread error response body using this request's controller.
    controller.abort();
  }
}

export default request;
