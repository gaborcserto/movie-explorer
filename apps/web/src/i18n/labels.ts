import type { ParseKeys } from 'i18next';

import { i18n } from './index';
import en from '../locales/en.json';
import hu from '../locales/hu.json';

const genreKeys: Record<string, ParseKeys> = {
  action: 'genres.action',
  adventure: 'genres.adventure',
  animation: 'genres.animation',
  comedy: 'genres.comedy',
  crime: 'genres.crime',
  documentary: 'genres.documentary',
  drama: 'genres.drama',
  family: 'genres.family',
  fantasy: 'genres.fantasy',
  history: 'genres.history',
  horror: 'genres.horror',
  music: 'genres.music',
  mystery: 'genres.mystery',
  romance: 'genres.romance',
  'science fiction': 'genres.science_fiction',
  thriller: 'genres.thriller',
  war: 'genres.war',
  western: 'genres.western',
  'action & adventure': 'genres.action_adventure',
  kids: 'genres.kids',
  news: 'genres.news',
  reality: 'genres.reality',
  'sci-fi & fantasy': 'genres.sci_fi_fantasy',
  soap: 'genres.soap',
  talk: 'genres.talk',
  'war & politics': 'genres.war_politics',
  'tv movie': 'genres.tv_movie',
};

export function genreLabel(value: string) {
  if (i18n.language === 'en-US') {
    return value;
  }

  const key = genreKeys[value.toLowerCase()];

  return key ? i18n.t(key) : value;
}

export function genreFilterValue(value: string) {
  const entry = Object.entries(hu.genres).find(
    ([, label]) =>
      label.toLocaleLowerCase('hu-HU') === value.toLocaleLowerCase('hu-HU')
  );

  if (entry) {
    const english: Record<string, string> = en.genres;

    return english[entry[0]];
  }

  return value.toLowerCase();
}

export function photoDescription(value: string) {
  const prefix = en.messages.portrait.split('{{name}}')[0];

  return value.startsWith(prefix)
    ? i18n.t('messages.portrait', { name: value.slice(prefix.length) })
    : value;
}

export function sortLabel(value: string) {
  switch (value.toLowerCase()) {
    case 'popularity':
      return i18n.t('ui.popularity');
    case 'title':
      return i18n.t('ui.title');
    case 'release date':
    case 'releasedate':
      return i18n.t('ui.release_date');
    case 'rating':
      return i18n.t('ui.rating');
    default:
      return value;
  }
}

const statusKeys: Record<string, ParseKeys> = {
  Released: 'statuses.Released',
  'Returning Series': 'statuses.Returning Series',
  Ended: 'statuses.Ended',
  Canceled: 'statuses.Canceled',
  'In Production': 'statuses.In Production',
  'Post Production': 'statuses.Post Production',
  Planned: 'statuses.Planned',
  Rumored: 'statuses.Rumored',
  Pilot: 'statuses.Pilot',
};

export function statusLabel(value: string | null | undefined) {
  const key = value ? statusKeys[value] : undefined;

  return key ? i18n.t(key) : value;
}
