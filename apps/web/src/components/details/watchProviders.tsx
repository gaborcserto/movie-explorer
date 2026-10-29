import { useCallback, useRef, useState } from 'react';
import type {
  WatchProvider,
  WatchProviderCategory,
} from '@movie-explorer/contracts';

import { Skeleton, SkeletonRegion } from '../skeleton';
import type useWatchProvidersResource from './useWatchProvidersResource';

import appleLogo from '../../assets/img/providers/apple.webp';
import disneyLogo from '../../assets/img/providers/disney.webp';
import netflixLogo from '../../assets/img/providers/netflix.webp';
import primeLogo from '../../assets/img/providers/prime.webp';
import rakutenLogo from '../../assets/img/providers/rakuten.webp';
import skyShowtimeLogo from '../../assets/img/providers/skyshowtime.webp';

const localLogos: Record<number, string> = {
  8: netflixLogo,
  9: primeLogo,
  10: primeLogo,
  119: primeLogo,
  613: primeLogo,
  2100: primeLogo,
  35: rakutenLogo,
  337: disneyLogo,
  350: appleLogo,
  1773: skyShowtimeLogo,
};

const categories: [WatchProviderCategory, string][] = [
  ['streaming', 'Streaming'],
  ['rent', 'Rent'],
  ['buy', 'Buy'],
];

function ProviderLogo({
  provider,
  categoryLabel,
}: {
  provider: WatchProvider;
  categoryLabel: string;
}) {
  const [broken, setBroken] = useState(false);
  const logoUrl = localLogos[provider.id] ?? provider.logoUrl;
  const accessibleLabel = `${provider.name} — ${categoryLabel}`;
  const logo =
    logoUrl && !broken ? (
      <img
        src={logoUrl}
        alt={accessibleLabel}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    ) : (
      <span role="img" aria-label={accessibleLabel}>
        {provider.name}
      </span>
    );

  return <li>{logo}</li>;
}

export default function WatchProviders({
  providers,
  resource,
}: {
  providers: WatchProvider[];
  resource?: ReturnType<typeof useWatchProvidersResource>;
}) {
  const retryRef = useRef<HTMLButtonElement>(null);

  const attachRetry = useCallback((button: HTMLButtonElement | null) => {
    const previous = retryRef.current;

    if (!button && previous && document.activeElement === previous) {
      previous.closest('main')?.focus({ preventScroll: true });
    }
    retryRef.current = button;
  }, []);

  const groups = categories
    .map(([key, label]) => ({
      key,
      label,
      providers: providers.filter(
        (provider) => provider.category === key && provider.name.trim()
      ),
    }))
    .filter((group) => group.providers.length > 0);

  if (resource?.error) {
    return (
      <div className="section-recovery" aria-busy={resource.pending}>
        <p role="status">
          {resource.pending
            ? 'Loading watch providers'
            : 'Watch providers could not be loaded.'}
        </p>
        {resource.pending && (
          <div aria-hidden="true">
            <Skeleton width={160} height={42} />
          </div>
        )}
        <button
          type="button"
          className="btn btn--outline btn--action"
          ref={attachRetry}
          aria-disabled={resource.pending}
          onClick={() => {
            if (!resource.pending) resource.retry();
          }}
        >
          Retry watch providers
        </button>
      </div>
    );
  }
  if (resource?.pending && groups.length === 0) {
    return (
      <SkeletonRegion
        label="Loading watch providers"
        className="watch-providers details-section"
      >
        <Skeleton width={160} height={22} />
        <div className="watch-providers__groups">
          <Skeleton width={42} height={42} radius={8} />
          <Skeleton width={42} height={42} radius={8} />
          <Skeleton width={42} height={42} radius={8} />
        </div>
      </SkeletonRegion>
    );
  }
  if (groups.length === 0) {
    return null;
  }

  return (
    <section
      className="details-section watch-providers"
      aria-labelledby="watch-providers-heading"
    >
      <div className="details-section__heading">
        <h2 id="watch-providers-heading">Where to watch</h2>
      </div>
      <div className="watch-providers__groups">
        {groups.map((group) => (
          <div className="watch-providers__group" key={group.key}>
            <h3>{group.label}</h3>
            <ul>
              {group.providers.map((provider) => (
                <ProviderLogo
                  key={`${group.key}-${provider.id}`}
                  provider={provider}
                  categoryLabel={group.label}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
