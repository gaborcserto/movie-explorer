import RecommendationRow from '../recommendationRow';

export default function DetailRecommendations({
  resource,
  id,
}: {
  resource: 'movies' | 'series';
  id: number;
}) {
  return (
    <RecommendationRow
      title={resource === 'movies' ? 'Similar Movies' : 'Similar Series'}
      allowMissingPosters={resource === 'movies'}
      source={{ resource, id, kind: 'similar' }}
    />
  );
}
