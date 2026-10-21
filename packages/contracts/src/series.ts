import type { SectionAvailability } from './availability';

export interface SeriesSummary {
  /** Stable wire discriminator; retained for existing mediaType:id identities. */
  mediaType: 'tv';
  id: number;
  title: string;
  originalTitle: string | null;
  firstAirDate: string | null;
  posterUrl: string | null;
  posterSrcSet?: string;
  genres: string[];
}

export interface SeasonSummary {
  id: number;
  seasonNumber: number;
  title: string;
  description: string | null;
  airDate: string | null;
  episodeCount: number | null;
  posterUrl: string | null;
  posterSrcSet?: string;
}

export interface CreditPerson {
  id?: number;
  name: string;
  profileUrl?: string;
  profileSrcSet?: string;
}

export interface SeriesOrganization {
  id: number;
  name: string;
  logoUrl: string | null;
  originCountry: string | null;
}

export interface SeriesDetails extends SeriesSummary {
  description: string | null;
  originalLanguage: string | null;
  status: string | null;
  inProduction: boolean | null;
  lastAirDate: string | null;
  seasonCount: number | null;
  episodeCount: number | null;
  episodeRuntimeMinutes: number[];
  rating: number | null;
  voteCount: number | null;
  originCountries: string[];
  backdropUrl: string | null;
  creators: CreditPerson[];
  networks: SeriesOrganization[];
  productionCompanies: SeriesOrganization[];
  seasons: SeasonSummary[];
}

export interface EpisodeSummary {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string | null;
  airDate: string | null;
  runtimeMinutes: number | null;
  stillUrl: string | null;
  rating: number | null;
  voteCount: number | null;
}

export interface SeasonDetails extends SeasonSummary {
  seriesId: number;
  /** Number of returned episode records, not an advertised schedule total. */
  episodeCount: number;
  episodes: EpisodeSummary[];
}

export interface EpisodeCastMember extends CreditPerson {
  characters: string[];
}

export interface EpisodeCrewMember extends CreditPerson {
  department: string | null;
  jobs: string[];
}

export interface EpisodeCredits {
  cast: EpisodeCastMember[];
  guestStars: EpisodeCastMember[];
  crew: EpisodeCrewMember[];
  sections: {
    cast: SectionAvailability;
    guestStars: SectionAvailability;
    crew: SectionAvailability;
  };
}

export interface EpisodeDetails extends EpisodeSummary {
  credits: EpisodeCredits;
}
