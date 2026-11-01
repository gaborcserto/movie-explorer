import { BadGatewayException, NotFoundException } from '@nestjs/common';
import type {
  RecommendationTitle,
  RelatedTitleKind,
  RelatedTitlesResponse,
} from '@movie-explorer/contracts';

import { mapSearch, searchPage } from './tmdb-search.mapper';
import { TmdbTransport } from './tmdb.transport';

export async function findRelatedTitles(
  transport: TmdbTransport,
  imageBaseUrl: string,
  mediaType: 'movie' | 'tv',
  id: number,
  kind: RelatedTitleKind,
): Promise<RelatedTitlesResponse> {
  const body = await transport.request({
    path: `/${mediaType}/${id}/${kind}`,
    operation: `${mediaType}-${kind}`,
    query: { page: '1' },
    allowNotFound: true,
    validateBody: (value) => {
      if (searchPage(value).page !== 1) {
        throw new Error('Unexpected related titles page');
      }
    },
  });

  if (body === undefined) {
    throw new NotFoundException('Title not found');
  }

  const page = searchPage(body);
  const results = new Map<number, RecommendationTitle>();
  let malformed = false;
  let validCount = 0;

  for (const entry of page.results) {
    // Adult exclusions are intentional filtering, not a degraded response.
    if (
      entry &&
      typeof entry === 'object' &&
      'adult' in entry &&
      entry.adult === true
    ) {
      continue;
    }

    const mapped = mapSearch(
      {
        page: page.page,
        total_pages: page.total_pages,
        total_results: page.total_results,
        results: [entry],
      },
      mediaType,
      imageBaseUrl,
    ).results[0];

    if (!mapped || mapped.mediaType === 'person') {
      malformed = true;
      continue;
    }

    validCount += 1;

    if (mapped.id !== id && !results.has(mapped.id) && results.size < 10) {
      results.set(mapped.id, mapped);
    }
  }

  if (malformed && validCount === 0) {
    throw new BadGatewayException('Movie provider response was invalid');
  }

  return {
    results: [...results.values()],
    availability: malformed ? 'partial' : 'available',
  };
}
