import type { MouseEvent } from 'react';
import {
  FaBookmark,
  FaCircleCheck,
  FaHeart,
  FaRegBookmark,
  FaRegCircleCheck,
  FaRegHeart,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import { useStore } from 'zustand';

import {
  mediaKey,
  selectLibraryMembership,
  useLibraryStore,
} from './libraryStore';
import type {
  LibraryCollection,
  LibraryMedia,
  LibraryMediaType,
} from './libraryStore';
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
    collection: 'watchlist',
    inactiveIcon: FaRegBookmark,
    activeIcon: FaBookmark,
    addLabel: 'Add to Watchlist',
    removeLabel: 'Remove from Watchlist',
  },
  {
    collection: 'watched',
    inactiveIcon: FaRegCircleCheck,
    activeIcon: FaCircleCheck,
    addLabel: 'Mark as Watched',
    removeLabel: 'Mark as Not Watched',
  },
  {
    collection: 'favorites',
    inactiveIcon: FaRegHeart,
    activeIcon: FaHeart,
    addLabel: 'Add to Favorites',
    removeLabel: 'Remove from Favorites',
  },
];

const actionLabels: Record<LibraryCollection, string> = {
  watchlist: 'Watchlist',
  watched: 'Watched',
  favorites: 'Favorites',
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
  const isWatchlisted = useStore(
    useLibraryStore,
    selectLibraryMembership(key, 'watchlist')
  );
  const isWatched = useStore(
    useLibraryStore,
    selectLibraryMembership(key, 'watched')
  );
  const isFavorite = useStore(
    useLibraryStore,
    selectLibraryMembership(key, 'favorites')
  );
  const memberships = [isWatchlisted, isWatched, isFavorite];

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
      aria-label={`${title} library actions`}
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
