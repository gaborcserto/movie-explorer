import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SeriesCastMember,
  SeriesDetails,
  SectionAvailability,
} from '@movie-explorer/contracts';

import CastPreview from '../../components/details/credits';
import useCrewPreview from '../../components/details/credits/useCrewPreview';
import DetailsTabs from '../../components/details/detailsTabs';
import { MediaSection } from '../../components/details/media';
import { SectionRecovery } from '../../components/details/recovery';
import useStablePanelHeight from '../../hooks/useStablePanelHeight';
import { getSeriesCredits } from '../../util/apiUtils';

const unavailable: SectionAvailability = { status: 'unavailable' };

function episodeLabel(count: number | null) {
  return count === null
    ? ''
    : `${count} ${count === 1 ? 'episode' : 'episodes'}`;
}

function departmentRank(department: string | null) {
  const priority = ['Directing', 'Writing', 'Production'].indexOf(
    department ?? ''
  );

  return priority < 0 ? 3 : priority;
}

function castRoles(person: SeriesCastMember) {
  const counts = person.characters.map((role) => role.episodeCount);
  const characterTotal =
    counts.length > 0 && counts.every((count) => count !== null)
      ? counts.reduce<number>((total, count) => total + (count ?? 0), 0)
      : null;
  const roles = person.characters.map((role) =>
    [role.character, episodeLabel(role.episodeCount)]
      .filter(Boolean)
      .join(' · ')
  );

  if (
    person.totalEpisodeCount !== null &&
    (characterTotal === null || characterTotal !== person.totalEpisodeCount)
  ) {
    roles.push(`Total: ${episodeLabel(person.totalEpisodeCount)}`);
  }

  return roles.filter(Boolean).join(' · ');
}

export default function SeriesSections({
  series,
  recoverImages,
  recoverVideos,
}: {
  series: SeriesDetails;
  recoverImages: (signal: AbortSignal) => Promise<void>;
  recoverVideos: (signal: AbortSignal) => Promise<void>;
}) {
  const creditTabId = useId();
  const [creditSelection, setCreditSelection] = useState<{
    resetKey: number;
    tab: 'cast' | 'crew';
  }>({ resetKey: series.id, tab: 'cast' });
  const activeCreditTab =
    creditSelection.resetKey === series.id ? creditSelection.tab : 'cast';
  const creditPanelsRef = useStablePanelHeight<HTMLDivElement>(
    `${series.id}:${activeCreditTab}`
  );

  const selectCreditTab = (tab: 'cast' | 'crew') =>
    setCreditSelection({ resetKey: series.id, tab });
  const [credits, setCredits] = useState(series.credits);
  const { images, videos } = series;
  const creditState =
    credits &&
    Object.values(credits.sections).every(
      (value) => value.status === 'available'
    )
      ? { status: 'available' as const }
      : unavailable;
  let imageState: SectionAvailability = unavailable;

  if (images) {
    const { backdrops, posters } = images.sections;

    if (backdrops.status === 'unavailable') {
      imageState = backdrops;
    } else if (posters.status === 'unavailable') {
      imageState = posters;
    } else {
      imageState = { status: 'available' };
    }
  }
  const crewGroups = new Map<string, NonNullable<typeof credits>['crew']>();
  const crew = [...(credits?.crew ?? [])].sort(
    (a, b) =>
      Math.min(
        ...a.departments.map((item) => departmentRank(item.department)),
        3
      ) -
      Math.min(
        ...b.departments.map((item) => departmentRank(item.department)),
        3
      )
  );
  const crewPreview = useCrewPreview(crew, series.id);
  crewPreview.visible.forEach((person) => {
    const departments = new Set(
      person.departments.map((credit) => credit.department ?? 'Other crew')
    );
    departments.forEach((department) => {
      crewGroups.set(department, [
        ...(crewGroups.get(department) ?? []),
        person,
      ]);
    });
  });

  return (
    <div className="series-sections">
      <section
        className="details-section series-credits"
        aria-labelledby={`${creditTabId}-heading`}
      >
        <h2 id={`${creditTabId}-heading`}>Cast &amp; Crew</h2>
        <SectionRecovery
          label="Cast and crew"
          availability={creditState}
          recover={async (signal) => {
            const result = await getSeriesCredits(series.id, signal);

            if (!signal.aborted) {
              setCredits(result);
            }
          }}
        />
        <DetailsTabs
          id={creditTabId}
          tabs={[
            { key: 'cast', label: 'Cast' },
            { key: 'crew', label: 'Crew' },
          ]}
          activeTab={activeCreditTab}
          ariaLabel="Cast and crew"
          onChange={selectCreditTab}
        />
        <div ref={creditPanelsRef} className="tab-panel-stable">
          <div
            id={`${creditTabId}-cast-panel`}
            className="details-tabs__panel"
            role="tabpanel"
            aria-labelledby={`${creditTabId}-cast-tab`}
            hidden={activeCreditTab !== 'cast'}
            tabIndex={0}
          >
            {credits?.cast.length ? (
              <CastPreview
                key={series.id}
                initialVisibleCount={16}
                batchSize={8}
                members={credits.cast.map((person, index) => ({
                  ...person,
                  key: `tv-${series.id}-${person.id ?? index}`,
                  roles: [castRoles(person)].filter(Boolean),
                }))}
              />
            ) : (
              credits?.sections.cast.status === 'available' && (
                <p>No cast information available.</p>
              )
            )}
          </div>
          <div
            id={`${creditTabId}-crew-panel`}
            className="details-tabs__panel"
            role="tabpanel"
            aria-labelledby={`${creditTabId}-crew-tab`}
            hidden={activeCreditTab !== 'crew'}
            tabIndex={0}
          >
            {credits?.sections.crew.status === 'unavailable' && (
              <p>Crew information is incomplete.</p>
            )}
            {crewPreview.summary}
            <div className="crew-groups" id={crewPreview.groupId}>
              {[...crewGroups]
                .sort(([a], [b]) => departmentRank(a) - departmentRank(b))
                .map(([department, people]) => (
                  <section className="crew-group" key={department}>
                    <h3>{department}</h3>
                    <ul className="crew-group__people">
                      {people.map((person, index) => (
                        <li key={person.id ?? index}>
                          {person.id ? (
                            <Link
                              to={`/person/${person.id}`}
                              className="person-credit-link text-link"
                            >
                              {person.name}
                            </Link>
                          ) : (
                            person.name
                          )}
                          {person.jobs
                            .filter(
                              (job) =>
                                (job.department ?? 'Other crew') === department
                            )
                            .map((job) => (
                              <p
                                key={
                                  job.creditId ??
                                  `${job.job}:${job.episodeCount}`
                                }
                              >
                                {[job.job, episodeLabel(job.episodeCount)]
                                  .filter(Boolean)
                                  .join(' \u2014 ')}
                              </p>
                            ))}
                          {person.departments
                            .filter(
                              (credit) =>
                                (credit.department ?? 'Other crew') ===
                                  department &&
                                credit.totalEpisodeCount !== null
                            )
                            .map((credit) => (
                              <p
                                key={`${credit.department}:${credit.totalEpisodeCount}`}
                              >
                                Department total:{' '}
                                {episodeLabel(credit.totalEpisodeCount)}
                              </p>
                            ))}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
            </div>
            {crewPreview.controls}
            {credits?.sections.crew.status === 'available' &&
              !credits.crew.length && <p>No crew information available.</p>}
          </div>
        </div>
      </section>
      <MediaSection
        title={series.title}
        resetKey={series.id}
        backdrops={images?.backdrops ?? []}
        posters={images?.posters ?? []}
        videos={videos?.videos ?? []}
        availability={{
          backdrops: images?.sections.backdrops,
          posters: images?.sections.posters,
          videos: videos?.availability ?? unavailable,
        }}
        imagesRecovery={
          <SectionRecovery
            label="Images"
            availability={imageState}
            recover={recoverImages}
          />
        }
        videosRecovery={
          <SectionRecovery
            label="Videos"
            availability={videos?.availability ?? unavailable}
            recover={recoverVideos}
          />
        }
      />
    </div>
  );
}
