import {
  ApiRequestError,
  API_REQUEST_TIMEOUT_MS,
  classifyHttpStatus,
} from './apiErrors';

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
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
  }, API_REQUEST_TIMEOUT_MS);
  let status: number | undefined;

  try {
    controller.signal.throwIfAborted();

    const response = await fetch(url, { ...init, signal: controller.signal });
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
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', cancel);
    // Release any unread error response body using this request's controller.
    controller.abort();
  }
}

export default request;
