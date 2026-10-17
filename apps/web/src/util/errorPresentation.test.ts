import { ApiRequestError } from './apiUtils';
import presentApiError, { isCancelledError } from './errorPresentation';

test.each([
  ['invalid-request', 'Invalid request'],
  ['not-found', 'Information not found'],
  ['network', 'Connection problem'],
  ['timeout', 'Request timed out'],
  ['rate-limited', 'Please try again shortly'],
  ['service-unavailable', 'Service temporarily unavailable'],
  ['internal-server', 'Something went wrong'],
  ['http', 'Something went wrong'],
  ['invalid-response', 'Unexpected response'],
] as const)('presents %s safely', (category, heading) => {
  expect(presentApiError(new ApiRequestError(category))?.heading).toBe(heading);
});

test('never presents untrusted exception content', () => {
  expect(presentApiError(new Error('secret URL and stack'))).toEqual({
    heading: 'Something went wrong',
    description: "We couldn't load this information. Please try again.",
  });
});

test('cancellation stays silent', () => {
  const error = new ApiRequestError('cancelled');
  expect(presentApiError(error)).toBeNull();
  expect(isCancelledError(error)).toBe(true);
  expect(isCancelledError(new DOMException('aborted', 'AbortError'))).toBe(
    true
  );
});

test.each([0, -1, 1.5, NaN, Infinity, 86401])(
  'ignores unsafe retry delay %s',
  (delay) => {
    expect(
      presentApiError(new ApiRequestError('rate-limited', 429, delay))
        ?.description
    ).toContain('wait a moment');
  }
);

test.each([
  [30, '30 seconds'],
  [90, '2 minutes'],
])('presents validated retry delay %s', (delay, label) => {
  expect(
    presentApiError(new ApiRequestError('rate-limited', 429, Number(delay)))
      ?.description
  ).toContain(label);
});
