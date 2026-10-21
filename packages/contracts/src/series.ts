import type { MediaPhoto, MediaVideo } from './movies';
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
  credits?: SeriesCredits;
  images?: SeriesImages;
  videos?: SeriesVideos;
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

export interface SeriesCharacter {
  creditId: string | null;
  character: string | null;
  episodeCount: number | null;
}

export interface SeriesJob {
  creditId: string | null;
  job: string | null;
  department: string | null;
  episodeCount: number | null;
}

export interface SeriesCastMember extends CreditPerson {
  characters: SeriesCharacter[];
  totalEpisodeCount: number | null;
}

export interface SeriesCrewDepartment {
  department: string | null;
  /** Provider total for this department; departments may overlap. */
  totalEpisodeCount: number | null;
}

export interface SeriesCrewMember extends CreditPerson {
  jobs: SeriesJob[];
  departments: SeriesCrewDepartment[];
}

export interface SeriesCredits {
  cast: SeriesCastMember[];
  crew: SeriesCrewMember[];
  sections: { cast: SectionAvailability; crew: SectionAvailability };
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
  stillSrcSet?: string;
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

export interface SeriesImages {
  posters: MediaPhoto[];
  backdrops: MediaPhoto[];
  sections: { posters: SectionAvailability; backdrops: SectionAvailability };
}

export interface SeriesVideos {
  videos: MediaVideo[];
  availability: SectionAvailability;
}
