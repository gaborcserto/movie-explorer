import { useTranslation } from 'react-i18next';
import type { SearchResult } from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';
import Card from '../../card';
import { mediaPath } from '../../../util/seriesRoutes';

const typeLabels = {
  get movie() {
    return i18n.t('ui.movie');
  },
  get tv() {
    return i18n.t('mediaTypes.tv');
  },
  get person() {
    return i18n.t('ui.person');
  },
};

export default function SearchResultCard({
  item,
  showMediaType = false,
}: {
  item: SearchResult;
  showMediaType?: boolean;
}) {
  useTranslation();

  const person = item.mediaType === 'person';
  const label = typeLabels[item.mediaType];
  let date: string | undefined;
  let rating: number | undefined;

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
      rating = item.rating;
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
