import { useTranslation } from 'react-i18next';
import type { MouseEvent } from 'react';
import {
  FaCircleCheck,
  FaHeart,
  FaRegCircleCheck,
  FaRegHeart,
  FaBookmark,
  FaRegBookmark,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import { useStore } from 'zustand';

import { i18n } from '../../../i18n';
import {
  mediaKey,
  selectLibraryMembership,
  useLibraryStore,
} from '../libraryStore';
import type {
  LibraryCollection,
  LibraryMedia,
  LibraryMediaType,
} from '../libraryStore';
import './personalLibraryActions.scss';

interface ActionDefinition {
  collection: LibraryCollection;
  inactiveIcon: IconType;
  activeIcon: IconType;
  addLabel: string;
  removeLabel: string;
}

const actions: ActionDefinition[] = [
  {
    collection: 'watched',
    inactiveIcon: FaRegCircleCheck,
    activeIcon: FaCircleCheck,
    get addLabel() {
      return i18n.t('ui.mark_as_watched');
    },
    get removeLabel() {
      return i18n.t('ui.mark_as_not_watched');
    },
  },
  {
    collection: 'favorites',
    inactiveIcon: FaRegHeart,
    activeIcon: FaHeart,
    get addLabel() {
      return i18n.t('ui.add_to_favorites');
    },
    get removeLabel() {
      return i18n.t('ui.remove_from_favorites');
    },
  },
  {
    collection: 'watchlist',
    inactiveIcon: FaRegBookmark,
    activeIcon: FaBookmark,
    get addLabel() {
      return i18n.t('ui.add_to_watchlist');
    },
    get removeLabel() {
      return i18n.t('ui.remove_from_watchlist');
    },
  },
];

const actionLabels: Record<LibraryCollection, string> = {
  get watchlist() {
    return i18n.t('ui.watchlist');
  },
  get watched() {
    return i18n.t('ui.watched');
  },
  get favorites() {
    return i18n.t('ui.favorites');
  },
};

export interface PersonalLibraryActionsProps {
  mediaType: LibraryMediaType;
  id: number;
  title: string;
  posterUrl?: string | null;
  year?: number;
  presentation?: 'compact' | 'expanded';
  releaseDate?: string;
  firstAirDate?: string | null;
  onMembershipRemoved?: () => void;
}

export default function PersonalLibraryActions({
  mediaType,
  id,
  title,
  posterUrl,
  year,
  presentation = 'compact',
  releaseDate,
  firstAirDate,
  onMembershipRemoved,
}: PersonalLibraryActionsProps) {
  useTranslation();

  const key = mediaKey(mediaType, id);
  const media: LibraryMedia =
    mediaType === 'movie'
      ? {
          mediaType,
          id,
          title,
          posterUrl,
          releaseDate: releaseDate ?? (year ? `${year}` : undefined),
        }
      : {
          mediaType,
          id,
          title,
          posterUrl,
          firstAirDate: firstAirDate ?? (year ? `${year}` : undefined),
        };

  const toggle = useLibraryStore((state) => state.toggle);
  const isWatched = useStore(
    useLibraryStore,
    selectLibraryMembership(key, 'watched')
  );
  const isFavorite = useStore(
    useLibraryStore,
    selectLibraryMembership(key, 'favorites')
  );
  const isWatchlisted = useStore(
    useLibraryStore,
    selectLibraryMembership(key, 'watchlist')
  );
  const memberships = [isWatched, isFavorite, isWatchlisted];

  const handleToggle = (
    event: MouseEvent<HTMLButtonElement>,
    collection: LibraryCollection,
    isActive: boolean
  ) => {
    event.stopPropagation();
    toggle(media, collection);

    if (isActive) {
      onMembershipRemoved?.();
    }
  };

  return (
    <div
      className={`personal-library-actions personal-library-actions--${presentation}`}
      aria-label={i18n.t('messages.libraryActions', { title })}
    >
      {actions.map(
        (
          { collection, inactiveIcon, activeIcon, addLabel, removeLabel },
          index
        ) => {
          const isActive = memberships[index];
          const Icon = isActive ? activeIcon : inactiveIcon;

          return (
            <button
              key={collection}
              type="button"
              className="personal-library-actions__button"
              aria-label={`${isActive ? removeLabel : addLabel} ${title}`}
              aria-pressed={isActive}
              onClick={(event) => handleToggle(event, collection, isActive)}
            >
              <Icon aria-hidden="true" focusable="false" />
              {presentation === 'expanded' && (
                <span className="personal-library-actions__label">
                  {actionLabels[collection]}
                </span>
              )}
            </button>
          );
        }
      )}
    </div>
  );
}
