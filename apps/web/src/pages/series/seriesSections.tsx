import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  SeriesDetails,
  SectionAvailability,
} from '@movie-explorer/contracts';

import CastPreview from '../../components/details/credits';
import PhotoPreview, { VideoPreview } from '../../components/details/media';
import { SectionRecovery } from '../../components/details/recovery';
import {
  getSeriesCredits,
  getSeriesImages,
  getSeriesVideos,
} from '../../util/apiUtils';
import '../../components/details/media/media.scss';

const unavailable: SectionAvailability = { status: 'unavailable' };

function episodeLabel(count: number | null) {
  return count === null
    ? ''
    : `${count} ${count === 1 ? 'episode' : 'episodes'}`;
}

export default function SeriesSections({ series }: { series: SeriesDetails }) {
  const crewCountRef = useRef<HTMLParagraphElement>(null);
  const [visibleCrewCount, setVisibleCrewCount] = useState(20);
  const [credits, setCredits] = useState(series.credits);
  const [images, setImages] = useState(series.images);
  const [videos, setVideos] = useState(series.videos);
  const creditState =
    credits &&
    Object.values(credits.sections).every(
      (value) => value.status === 'available'
    )
      ? { status: 'available' as const }
      : unavailable;
  const imageState =
    images &&
    Object.values(images.sections).every(
      (value) => value.status === 'available'
    )
      ? { status: 'available' as const }
      : unavailable;
  const crewGroups = new Map<string, NonNullable<typeof credits>['crew']>();
  const priority = (department: string | null) =>
    ['Directing', 'Writing', 'Production'].indexOf(department ?? '');
  const crew = [...(credits?.crew ?? [])].sort((a, b) => {
    const rank = (person: typeof a) =>
      Math.min(
        ...person.departments.map((item) => {
          const index = priority(item.department);
          return index < 0 ? 3 : index;
        }),
        3
      );
    return rank(a) - rank(b);
  });
  crew.slice(0, visibleCrewCount).forEach((person) => {
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
      <div className="cast-crew-layout">
        <section
          className="series-section"
          aria-labelledby="series-cast-heading"
        >
          <h2 id="series-cast-heading">Cast</h2>
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
          {credits?.cast.length ? (
            <CastPreview
              members={credits.cast.map((person, index) => ({
                ...person,
                key: `tv-${series.id}-${person.id ?? index}`,
                roles: [
                  ...person.characters.map((role) =>
                    [role.character, episodeLabel(role.episodeCount)]
                      .filter(Boolean)
                      .join(' — ')
                  ),
                  ...(person.totalEpisodeCount === null
                    ? []
                    : [`Total: ${episodeLabel(person.totalEpisodeCount)}`]),
                ].filter(Boolean),
              }))}
            />
          ) : (
            credits?.sections.cast.status === 'available' && (
              <p>No cast information available.</p>
            )
          )}
        </section>
        <section
          className="series-section"
          aria-labelledby="series-crew-heading"
        >
          <h2 id="series-crew-heading">Crew</h2>
          {credits?.sections.crew.status === 'unavailable' && (
            <p>Crew information is incomplete.</p>
          )}
          <p ref={crewCountRef} role="status" tabIndex={-1}>
            Showing {Math.min(visibleCrewCount, credits?.crew.length ?? 0)} of{' '}
            {credits?.crew.length ?? 0} crew members
          </p>
          <div className="crew-groups">
            {[...crewGroups].map(([department, people]) => (
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
                      <p>
                        {person.jobs
                          .filter(
                            (job) =>
                              (job.department ?? 'Other crew') === department
                          )
                          .map((job) =>
                            [job.job, episodeLabel(job.episodeCount)]
                              .filter(Boolean)
                              .join(' — ')
                          )
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
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
          {credits && visibleCrewCount < credits.crew.length && (
            <button
              type="button"
              className="btn btn--outline btn--action"
              onClick={() => {
                setVisibleCrewCount((count) => count + 20);
                if (visibleCrewCount + 20 >= credits.crew.length) {
                  crewCountRef.current?.focus({ preventScroll: true });
                }
              }}
            >
              Show more crew
            </button>
          )}
          {credits?.sections.crew.status === 'available' &&
            !credits.crew.length && <p>No crew information available.</p>}
        </section>
      </div>
      <section
        className="series-section"
        aria-labelledby="series-images-heading"
      >
        <h2 id="series-images-heading">Images</h2>
        <SectionRecovery
          label="Images"
          availability={imageState}
          recover={async (signal) => {
            const result = await getSeriesImages(series.id, signal);
            if (!signal.aborted) {
              setImages(result);
            }
          }}
        />
        <h3>Posters</h3>
        {images?.posters.length ? (
          <PhotoPreview
            photos={images.posters}
            title={series.title}
            category="posters"
            portrait
            resetKey={series.id}
          />
        ) : (
          images?.sections.posters.status === 'available' && (
            <p>No posters available.</p>
          )
        )}
        <h3>Backdrops</h3>
        {images?.backdrops.length ? (
          <PhotoPreview
            photos={images.backdrops}
            title={series.title}
            category="backdrops"
            resetKey={series.id}
          />
        ) : (
          images?.sections.backdrops.status === 'available' && (
            <p>No backdrops available.</p>
          )
        )}
      </section>
      <section
        className="series-section"
        aria-labelledby="series-videos-heading"
      >
        <h2 id="series-videos-heading">Videos</h2>
        <SectionRecovery
          label="Videos"
          availability={videos?.availability ?? unavailable}
          recover={async (signal) => {
            const result = await getSeriesVideos(series.id, signal);
            if (!signal.aborted) {
              setVideos(result);
            }
          }}
        />
        {videos?.videos.length ? (
          <VideoPreview
            videos={videos.videos}
            title={series.title}
            resetKey={series.id}
          />
        ) : (
          videos?.availability.status === 'available' && (
            <p>No videos available.</p>
          )
        )}
      </section>
    </div>
  );
}
