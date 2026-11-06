import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import type { SectionAvailability } from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';
import { ApiRequestError } from '../../../util/apiUtils';
import { isCancelledError } from '../../../util/errorPresentation';
import './sectionRecovery.scss';
import { SectionSkeleton } from '../../skeleton';

interface Props {
  label: string;
  availability?: SectionAvailability;
  recover: (signal: AbortSignal) => Promise<void>;
}

export default function SectionRecovery({
  label,
  availability,
  recover,
}: Props) {
  useTranslation();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [delay, setDelay] = useState(
    availability?.status === 'unavailable'
      ? (availability.retryAfterSeconds ?? 0)
      : 0
  );
  const [recovered, setRecovered] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!delay) {
      return undefined;
    }

    const timer = window.setTimeout(() => setDelay(delay - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [delay]);

  const unavailable = availability?.status === 'unavailable';

  const retry = async () => {
    if (controllerRef.current || delay) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setError(false);

    try {
      await recover(controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (containerRef.current?.contains(document.activeElement)) {
        containerRef.current.focus({ preventScroll: true });
      }
      setRecovered(true);
    } catch (failure: unknown) {
      if (controller.signal.aborted || isCancelledError(failure)) {
        return;
      }

      setError(true);
      if (failure instanceof ApiRequestError) {
        setDelay(failure.retryAfterSeconds ?? 0);
      }
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
      }

      controllerRef.current = null;
    }
  };

  if (!unavailable && !recovered) {
    return null;
  }

  let message = i18n.t('messages.sectionLoaded', { label });

  if (unavailable) {
    message = i18n.t('messages.sectionUnavailable', {
      label,
      guidance: error ? i18n.t('messages.retryGuidance') : '',
    });
  }

  if (pending) {
    message = i18n.t('messages.sectionLoading', { label: label.toLowerCase() });
  }

  return (
    <div
      className="section-recovery"
      ref={containerRef}
      tabIndex={-1}
      aria-busy={pending}
    >
      <p role="status" className={pending ? 'visually-hidden' : undefined}>
        {message}
      </p>
      {pending && (
        <div aria-hidden="true">
          <SectionSkeleton
            label={label}
            portraits={/cast|crew|credits/i.test(label)}
          />
        </div>
      )}
      {unavailable && (
        <button
          type="button"
          className="btn btn--outline btn--action"
          aria-disabled={pending || delay > 0}
          onClick={retry}
        >
          {delay > 0
            ? i18n.t('messages.sectionRetryDelay', {
                label: label.toLowerCase(),
                count: delay,
              })
            : i18n.t('messages.sectionRetry', { label: label.toLowerCase() })}
        </button>
      )}
    </div>
  );
}
