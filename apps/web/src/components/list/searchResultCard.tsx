import type { SearchResult } from '@movie-explorer/contracts';

import Card from '../card/card';

const typeLabels = { movie: 'Movie', tv: 'Series', person: 'Person' };

export default function SearchResultCard({ item }: { item: SearchResult }) {
  const person = item.mediaType === 'person';
  const label = typeLabels[item.mediaType];
  let date: string | undefined;
  let metadata: string | undefined;

  if (item.mediaType === 'person') {
    metadata = item.knownForDepartment;
  } else {
    date = item.mediaType === 'tv' ? item.firstAirDate : item.releaseDate;
    if (item.rating !== undefined) metadata = `${item.rating.toFixed(1)} / 10`;
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
      destination={`/${item.mediaType}/${item.id}`}
      displayDate={date}
      subtitle={[label, metadata].filter(Boolean).join(' / ')}
      genreNavigation={false}
    />
  );
}
