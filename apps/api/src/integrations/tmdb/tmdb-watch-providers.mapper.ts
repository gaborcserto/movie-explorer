import type {
  WatchProvider,
  WatchProviderCategory,
  WatchProviders,
} from '@movie-explorer/contracts';

const categories = ['flatrate', 'rent', 'buy'] as const;
const categoryNames: Record<
  (typeof categories)[number],
  WatchProviderCategory
> = {
  flatrate: 'streaming',
  rent: 'rent',
  buy: 'buy',
};

export function mapWatchProviders(
  body: unknown,
  imageBaseUrl: string,
): WatchProviders {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { providers: [] };
  }

  const results = (body as Record<string, unknown>).results;

  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    return { providers: [] };
  }

  const hu = (results as Record<string, unknown>).HU;

  if (!hu || typeof hu !== 'object' || Array.isArray(hu)) {
    return { providers: [] };
  }

  const region = hu as Record<string, unknown>;
  const link =
    typeof region.link === 'string' && /^https:\/\//.test(region.link)
      ? region.link
      : undefined;
  const providers: WatchProvider[] = [];

  for (const key of categories) {
    const rows = region[key];

    if (!Array.isArray(rows)) {
      continue;
    }

    const seen = new Set<number>();

    for (const item of rows) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const row = item as Record<string, unknown>;

      if (
        !Number.isSafeInteger(row.provider_id) ||
        (row.provider_id as number) <= 0 ||
        typeof row.provider_name !== 'string' ||
        !row.provider_name.trim()
      ) {
        continue;
      }

      const id = row.provider_id as number;

      if (seen.has(id)) {
        continue;
      }

      seen.add(id);

      const logoUrl =
        typeof row.logo_path === 'string' && row.logo_path.startsWith('/')
          ? `${imageBaseUrl.replace(/\/t\/p\/[^/]+\/?$/, '/t/p/w92')}${row.logo_path}`
          : undefined;
      providers.push({
        id,
        name: row.provider_name.trim(),
        ...(logoUrl && { logoUrl }),
        category: categoryNames[key],
        region: 'HU',
        ...(link && { watchUrl: link }),
      });
    }
  }

  return { providers };
}
