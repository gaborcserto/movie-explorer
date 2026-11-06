import { useTranslation } from 'react-i18next';
import { useState } from 'react';

import { i18n } from '../../../i18n';

export default function ProductionCompanies({
  companies,
}: {
  companies: { id: number; name: string }[];
}) {
  useTranslation();

  const [expanded, setExpanded] = useState(false);
  const previewCount = 3;
  const visibleCompanies = expanded
    ? companies
    : companies.slice(0, previewCount);

  return (
    <>
      <span>{visibleCompanies.map((company) => company.name).join(', ')}</span>
      {companies.length > previewCount && (
        <button
          className="series-metadata-toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? i18n.t('ui.show_less') : i18n.t('ui.show_more')}
        </button>
      )}
    </>
  );
}
