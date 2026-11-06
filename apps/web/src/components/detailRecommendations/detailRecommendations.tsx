import { useTranslation } from 'react-i18next';

import { i18n } from '../../i18n';
import RecommendationRow from '../recommendationRow';

export default function DetailRecommendations({
  resource,
  id,
}: {
  resource: 'movies' | 'series';
  id: number;
}) {
  useTranslation();

  return (
    <RecommendationRow
      title={
        resource === 'movies'
          ? i18n.t('ui.similar_movies')
          : i18n.t('ui.similar_series')
      }
      allowMissingPosters={resource === 'movies'}
      source={{ resource, id, kind: 'similar' }}
    />
  );
}
