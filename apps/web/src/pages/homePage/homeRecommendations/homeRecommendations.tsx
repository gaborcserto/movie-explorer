import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FaCompass } from 'react-icons/fa6';

import RecommendationRow from '../../../components/recommendationRow';

const tabs = [
  { value: 'movies', label: 'Movies' },
  { value: 'series', label: 'Series' },
] as const;
type RecommendationTab = (typeof tabs)[number]['value'];

export default function HomeRecommendations() {
  const [selected, setSelected] = useState<RecommendationTab>('movies');
  const [visited, setVisited] = useState<RecommendationTab[]>(['movies']);
  const groupId = 'recommendations';

  const select = (tab: RecommendationTab) => {
    setSelected(tab);
    setVisited((previous) =>
      previous.includes(tab) ? previous : [...previous, tab]
    );
  };

  const selectFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next: RecommendationTab;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      next = selected === 'movies' ? 'series' : 'movies';
    } else if (event.key === 'Home') {
      next = 'movies';
    } else if (event.key === 'End') {
      next = 'series';
    } else {
      return;
    }

    event.preventDefault();
    select(next);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[id="${groupId}-${next}-tab"]`)
      ?.focus({ preventScroll: true });
  };

  return (
    <section
      className="home-recommendations discover-category"
      aria-labelledby={`${groupId}-heading`}
    >
      <div className="discover-category__heading">
        <h2 id={`${groupId}-heading`}>
          <FaCompass aria-hidden="true" /> Recommendations
        </h2>
        <div
          className="discover-category__tabs"
          role="tablist"
          aria-label="Recommendation categories"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`${groupId}-${tab.value}-tab`}
              aria-controls={`${groupId}-${tab.value}-panel`}
              aria-selected={selected === tab.value}
              tabIndex={selected === tab.value ? 0 : -1}
              onClick={() => select(tab.value)}
              onKeyDown={selectFromKeyboard}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.value}
          id={`${groupId}-${tab.value}-panel`}
          role="tabpanel"
          aria-labelledby={`${groupId}-${tab.value}-tab`}
          tabIndex={0}
          hidden={selected !== tab.value}
        >
          {visited.includes(tab.value) && (
            <RecommendationRow
              title={`Popular ${tab.label}`}
              source={{ category: `popular-${tab.value}` }}
              home
            />
          )}
        </div>
      ))}
    </section>
  );
}
