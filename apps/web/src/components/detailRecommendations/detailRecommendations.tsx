import RecommendationRow from '../recommendationRow';

export default function DetailRecommendations({
  resource,
  id,
}: {
  resource: 'movies' | 'series';
  id: number;
}) {
  const label = resource === 'movies' ? 'Movies' : 'Series';

  return (
    <RecommendationRow
      title={`Similar ${label}`}
      source={{ resource, id, kind: 'similar' }}
    />
  );
}
