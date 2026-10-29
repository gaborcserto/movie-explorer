import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SeriesCastMember,
  SeriesDetails,
  SectionAvailability,
} from '@movie-explorer/contracts';

import CastPreview from '../../components/details/credits';
import useCrewPreview from '../../components/details/credits/useCrewPreview';
import { MediaSection } from '../../components/details/media';
import { SectionRecovery } from '../../components/details/recovery';
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
  const [activeCreditTab, setActiveCreditTab] = useState<'cast' | 'crew'>(
    'cast'
  );
  const creditTabId = useId();
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
        aria-label="Cast and crew"
      >
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
        <div
          className="series-credit-tabs"
          role="tablist"
          tabIndex={-1}
          aria-label="Series credits"
          onKeyDown={(event) => {
            if (
              event.key === 'ArrowLeft' ||
              event.key === 'ArrowRight' ||
              event.key === 'Home' ||
              event.key === 'End'
            ) {
              event.preventDefault();
              let next: 'cast' | 'crew';

              if (event.key === 'Home') {
                next = 'cast';
              } else if (event.key === 'End') {
                next = 'crew';
              } else {
                next = activeCreditTab === 'cast' ? 'crew' : 'cast';
              }

              setActiveCreditTab(next);
              document.getElementById(`${creditTabId}-${next}-tab`)?.focus();
            }
          }}
        >
          {(['cast', 'crew'] as const).map((tab) => (
            <button
              key={tab}
              id={`${creditTabId}-${tab}-tab`}
              type="button"
              role="tab"
              aria-selected={activeCreditTab === tab}
              aria-controls={`${creditTabId}-${tab}-panel`}
              tabIndex={activeCreditTab === tab ? 0 : -1}
              onClick={() => setActiveCreditTab(tab)}
            >
              {tab === 'cast' ? 'Cast' : 'Crew'}
            </button>
          ))}
        </div>
        <div
          id={`${creditTabId}-cast-panel`}
          role="tabpanel"
          aria-labelledby={`${creditTabId}-cast-tab`}
          hidden={activeCreditTab !== 'cast'}
          tabIndex={0}
        >
          {credits?.cast.length ? (
            <CastPreview
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
                            className="person-credit-link"
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
                                job.creditId ?? `${job.job}:${job.episodeCount}`
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
                                department && credit.totalEpisodeCount !== null
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
          videos: videos?.availability,
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
