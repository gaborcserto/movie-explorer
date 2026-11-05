import { useState } from 'react';

export default function ProductionCompanies({
  companies,
}: {
  companies: { id: number; name: string }[];
}) {
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
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}
