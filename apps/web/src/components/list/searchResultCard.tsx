import type { SearchResult } from '@movie-explorer/contracts';

import Card from '../card/card';
import { mediaPath } from '../../util/seriesRoutes';

const typeLabels = { movie: 'Movie', tv: 'Series', person: 'Person' };

export default function SearchResultCard({ item }: { item: SearchResult }) {
  const person = item.mediaType === 'person';
  const label = typeLabels[item.mediaType];
  let date: string | undefined;
  let rating: string | undefined;

  if (item.mediaType !== 'person') {
    date =
      item.mediaType === 'tv'
        ? (item.firstAirDate ?? undefined)
        : item.releaseDate;
    if (item.rating !== undefined) rating = `${item.rating.toFixed(1)} / 10`;
  }

  return (
    <Card
      key={`${item.mediaType}:${item.id}`}
      movie={{
        id: item.id,
        title: person ? item.name : item.title,
        posterUrl: person ? (item.profileUrl ?? '') : (item.posterUrl ?? ''),
        genres: [],
      }}
      destination={mediaPath(item.mediaType, item.id)}
      displayDate={date}
      subtitle={
        person
          ? [label, item.knownForDepartment].filter(Boolean).join(' / ')
          : undefined
      }
      rating={rating}
      libraryMedia={
        item.mediaType === 'person'
          ? undefined
          : {
              mediaType: item.mediaType,
              firstAirDate:
                item.mediaType === 'tv' ? item.firstAirDate : undefined,
            }
      }
      genreNavigation={false}
    />
  );
}
