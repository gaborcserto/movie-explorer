import { useEffect, useRef, useState } from 'react';
import type {
  PersonalizedRecommendationRequest,
  PersonalizedRecommendationResponse,
  RecommendationCategory,
  RelatedTitleKind,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

import {
  getPersonalizedRecommendations,
  getRecommendations,
  getRelatedTitles,
} from '../../util/apiUtils';
import { ApiRequestError } from '../../util/apiErrors';
import { isCancelledError } from '../../util/errorPresentation';

export type RecommendationSource =
  | {
      category: RecommendationCategory;
      preferences?: PersonalizedRecommendationRequest;
      libraryKey?: string;
      resource?: never;
      id?: never;
      kind?: never;
    }
  | {
      category?: never;
      preferences?: never;
      libraryKey?: never;
      resource: 'movies' | 'series';
      id: number;
      kind: RelatedTitleKind;
    };

export default function useRecommendationResource(
  source: RecommendationSource
) {
  const { category, resource, id, kind, preferences } = source;
  const containerRef = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(true);
  const [data, setData] = useState<
    RelatedTitlesResponse | PersonalizedRecommendationResponse
  >();
  const [error, setError] = useState<unknown>();
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    const element = containerRef.current;

    if (!element || typeof IntersectionObserver === 'undefined') {
      setEnabled(true);

      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();
    setPending(true);
    setError(undefined);

    // StrictMode cleanup can cancel before starting an unnecessary request.
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) {
        return;
      }

      try {
        let result: RelatedTitlesResponse | PersonalizedRecommendationResponse;

        if (preferences) {
          result = await getPersonalizedRecommendations(
            preferences,
            controller.signal
          );
        } else if (category) {
          result = await getRecommendations(category, controller.signal);
        } else {
          result = await getRelatedTitles(
            resource,
            id,
            kind,
            controller.signal
          );
        }

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (failure: unknown) {
        if (!controller.signal.aborted && !isCancelledError(failure)) {
          setError(failure);
          setDelay(
            failure instanceof ApiRequestError
              ? (failure.retryAfterSeconds ?? 0)
              : 0
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPending(false);
        }
      }
    });

    return () => controller.abort();
  }, [category, resource, id, kind, enabled, attempt, preferences]);

  useEffect(() => {
    if (!delay) {
      return undefined;
    }

    const timer = window.setTimeout(() => setDelay(delay - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [delay]);

  const retry = () => {
    if (!pending && !delay) {
      setAttempt((value) => value + 1);
    }
  };

  return { containerRef, data, error, pending, retry, delay };
}
