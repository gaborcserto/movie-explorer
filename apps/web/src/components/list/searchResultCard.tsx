import type { SearchResult } from '@movie-explorer/contracts';

import Card from '../card';
import { mediaPath } from '../../util/seriesRoutes';

const typeLabels = { movie: 'Movie', tv: 'Series', person: 'Person' };

export default function SearchResultCard({
  item,
  showMediaType = false,
}: {
  item: SearchResult;
  showMediaType?: boolean;
}) {
  const person = item.mediaType === 'person';
  const label = typeLabels[item.mediaType];
  let date: string | undefined;
  let rating: string | undefined;

  if (item.mediaType !== 'person') {
    date =
      item.mediaType === 'tv'
        ? (item.firstAirDate ?? undefined)
        : item.releaseDate;
    if (
      item.rating !== undefined &&
      Number.isFinite(item.rating) &&
      item.rating > 0 &&
      item.rating <= 10
    ) {
      rating = `${item.rating.toFixed(1)} / 10`;
    }
  }

  let subtitle: string | undefined;

  if (person) {
    subtitle = [label, item.knownForDepartment].filter(Boolean).join(' / ');
  } else if (showMediaType) {
    subtitle = label;
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
      subtitle={subtitle}
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
