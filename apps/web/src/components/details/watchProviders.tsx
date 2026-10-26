import { useState } from 'react';
import type {
  WatchProvider,
  WatchProviderCategory,
} from '@movie-explorer/contracts';
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
}: {
  providers: WatchProvider[];
}) {
  const groups = categories.map(([key, label]) => ({
    key,
    label,
    providers: providers.filter(
      (provider) => provider.category === key && provider.name.trim()
    ),
  }));
  if (groups.every((group) => group.providers.length === 0)) return null;

  return (
    <section
      className="details-section watch-providers"
      aria-labelledby="watch-providers-heading"
    >
      <div className="details-section__heading">
        <h2 id="watch-providers-heading">Where to watch</h2>
      </div>
      <div className="watch-providers__groups">
        {groups.map((group) =>
          group.providers.length > 0 ? (
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
          ) : (
            <div
              aria-hidden="true"
              className="watch-providers__empty"
              key={group.key}
            />
          )
        )}
      </div>
    </section>
  );
}
