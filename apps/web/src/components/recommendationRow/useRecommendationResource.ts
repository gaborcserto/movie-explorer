import { useEffect, useRef, useState } from 'react';
import type {
  MovieCollectionResponse,
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
  getMovieCollection,
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
      kind: RelatedTitleKind | 'collection';
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
    | RelatedTitlesResponse
    | PersonalizedRecommendationResponse
    | MovieCollectionResponse
  >();
  const [error, setError] = useState<unknown>();
  const [delay, setDelay] = useState(0);
  const [identity, setIdentity] = useState({
    category,
    resource,
    id,
    kind,
    preferences,
  });

  if (
    identity.category !== category ||
    identity.resource !== resource ||
    identity.id !== id ||
    identity.kind !== kind ||
    identity.preferences !== preferences
  ) {
    setIdentity({ category, resource, id, kind, preferences });
    setData(undefined);
    setError(undefined);
    setPending(true);
    setDelay(0);
    setAttempt(0);
  }

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

    // StrictMode cleanup can cancel before starting an unnecessary request.
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) {
        return;
      }

      try {
        let result:
          | RelatedTitlesResponse
          | PersonalizedRecommendationResponse
          | MovieCollectionResponse;

        if (preferences) {
          result = await getPersonalizedRecommendations(
            preferences,
            controller.signal
          );
        } else if (category) {
          result = await getRecommendations(category, controller.signal);
        } else if (kind === 'collection') {
          result = await getMovieCollection(id, controller.signal);
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
      setPending(true);
      setError(undefined);
      setAttempt((value) => value + 1);
    }
  };

  return { containerRef, data, error, pending, retry, delay };
}
