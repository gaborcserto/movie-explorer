import { HttpException } from '@nestjs/common';

export type RatingFailureReason =
  | 'timeout'
  | 'invalid-response'
  | 'upstream-error';

export function ratingFailureReason(error: unknown): RatingFailureReason {
  if (!(error instanceof HttpException)) {
    return 'upstream-error';
  }

  if (error.getStatus() === 504) {
    return 'timeout';
  }

  if (error.message === 'Movie provider response was invalid') {
    return 'invalid-response';
  }

  return 'upstream-error';
}
