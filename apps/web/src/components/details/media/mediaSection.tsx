import { useTranslation } from 'react-i18next';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  MediaPhoto,
  MediaVideo,
  SectionAvailability,
} from '@movie-explorer/contracts';

import { i18n } from '../../../i18n';
import DetailsTabs from '../detailsTabs';
import useStablePanelHeight from '../../../hooks/useStablePanelHeight';
import PhotoPreview from './photoPreview';
import VideoPreview from './videoPreview';

interface Props {
  title: string;
  resetKey: number;
  backdrops: MediaPhoto[];
  posters: MediaPhoto[];
  videos: MediaVideo[];
  availability?: {
    backdrops?: SectionAvailability;
    posters?: SectionAvailability;
    videos?: SectionAvailability;
  };
  backdropsRecovery?: ReactNode;
  postersRecovery?: ReactNode;
  videosRecovery?: ReactNode;
  imagesRecovery?: ReactNode;
}

const mediaTabs = [
  {
    key: 'backdrops',
    get label() {
      return i18n.t('ui.backdrops');
    },
  },
  {
    key: 'posters',
    get label() {
      return i18n.t('ui.posters');
    },
  },
  {
    key: 'videos',
    get label() {
      return i18n.t('ui.videos_trailers');
    },
  },
] as const;

type MediaTab = (typeof mediaTabs)[number]['key'];

export default function MediaSection({
  title,
  resetKey,
  backdrops,
  posters,
  videos,
  availability,
  backdropsRecovery,
  postersRecovery,
  videosRecovery,
  imagesRecovery,
}: Props) {
  useTranslation();

  const [tabSelection, setTabSelection] = useState<{
    resetKey: number;
    tab: MediaTab;
  }>({ resetKey, tab: 'backdrops' });
  const tabsId = useId();

  const activeTab =
    tabSelection.resetKey === resetKey ? tabSelection.tab : 'backdrops';
  const panelsRef = useStablePanelHeight<HTMLDivElement>(
    `${resetKey}:${activeTab}`
  );

  const hasBackdrops = backdrops.length > 0;
  const hasPosters = posters.length > 0;
  const hasVideos = videos.length > 0;
  const hasBackdropsState = availability?.backdrops?.status === 'unavailable';
  const hasPostersState = availability?.posters?.status === 'unavailable';
  const hasVideosState = availability?.videos?.status === 'unavailable';
  const showBackdrops = hasBackdrops || hasBackdropsState;
  const showPosters = hasPosters || hasPostersState;
  const showVideos = hasVideos || hasVideosState;
  const showSection = showBackdrops || showPosters || showVideos;

  const selectTab = (tab: MediaTab) => setTabSelection({ resetKey, tab });

  return (
    <>
      {imagesRecovery}
      {showSection && (
        <section
          className="details-section media-section"
          aria-labelledby={`${tabsId}-heading`}
        >
          <h2 id={`${tabsId}-heading`}>{i18n.t('ui.media')}</h2>
          <DetailsTabs
            id={tabsId}
            tabs={mediaTabs}
            activeTab={activeTab}
            ariaLabel={i18n.t('ui.media_categories')}
            onChange={selectTab}
          />
          <div ref={panelsRef} className="tab-panel-stable">
            <div
              className="details-tabs__panel"
              id={`${tabsId}-backdrops-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-backdrops-tab`}
              hidden={activeTab !== 'backdrops'}
              tabIndex={0}
            >
              {backdropsRecovery}
              {hasBackdrops ? (
                <PhotoPreview
                  photos={backdrops}
                  title={title}
                  category="backdrops"
                  resetKey={resetKey}
                />
              ) : (
                !hasBackdropsState && (
                  <p className="media-section__empty">
                    {i18n.t('ui.no_backdrops_are_available')}
                  </p>
                )
              )}
            </div>
            <div
              className="details-tabs__panel"
              id={`${tabsId}-posters-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-posters-tab`}
              hidden={activeTab !== 'posters'}
              tabIndex={0}
            >
              {postersRecovery}
              {hasPosters ? (
                <PhotoPreview
                  photos={posters}
                  title={title}
                  portrait
                  category="posters"
                  resetKey={resetKey}
                />
              ) : (
                !hasPostersState && (
                  <p className="media-section__empty">
                    {i18n.t('ui.no_posters_are_available')}
                  </p>
                )
              )}
            </div>
            <div
              className="details-tabs__panel"
              id={`${tabsId}-videos-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-videos-tab`}
              hidden={activeTab !== 'videos'}
              tabIndex={0}
            >
              {videosRecovery}
              {hasVideos ? (
                <VideoPreview
                  videos={videos}
                  title={title}
                  resetKey={resetKey}
                />
              ) : (
                !hasVideosState && (
                  <p className="media-section__empty">
                    {i18n.t('ui.no_videos_are_available')}
                  </p>
                )
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
