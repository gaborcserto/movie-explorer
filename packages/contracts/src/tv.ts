export interface TvSeriesSummary {
  mediaType: 'tv';
  id: number;
  title: string;
  originalTitle: string | null;
  firstAirDate: string | null;
  posterUrl: string | null;
  posterSrcSet?: string;
  genres: string[];
}

export interface TvSeasonSummary {
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

export interface TvOrganization {
  id: number;
  name: string;
  logoUrl: string | null;
  originCountry: string | null;
}

export interface TvSeriesDetails extends TvSeriesSummary {
  description: string | null;
  originalLanguage: string | null;
  status: string | null;
  inProduction: boolean | null;
  lastAirDate: string | null;
  seasonCount: number | null;
  episodeCount: number | null;
  episodeRuntimeMinutes: number[];
  rating: number | null;
  backdropUrl: string | null;
  creators: CreditPerson[];
  networks: TvOrganization[];
  productionCompanies: TvOrganization[];
  seasons: TvSeasonSummary[];
}
