import { getDisplaySrcSet, getPosterDisplaySrcSet } from './imageSizing';

const posterSrcSet =
  '/images/w342/poster.jpg 1x, /images/w780/poster.jpg 2x, /images/original/poster.jpg 3x';
const profileSrcSet =
  '/images/w185/profile.jpg 1x, /images/h632/profile.jpg 2x, /images/original/profile.jpg 3x';

describe('display image candidates', () => {
  it('offers supplied poster widths for responsive cards and heroes without originals', () => {
    expect(
      getPosterDisplaySrcSet('/images/w500/poster.jpg', posterSrcSet)
    ).toBe(
      '/images/w342/poster.jpg 342w, /images/w500/poster.jpg 500w, /images/w780/poster.jpg 780w'
    );
    expect(posterSrcSet).toContain('/original/');
  });

  it('deduplicates the source and preserves density semantics for custom providers', () => {
    expect(
      getPosterDisplaySrcSet('/images/w342/poster.jpg', posterSrcSet)
    ).toBe('/images/w342/poster.jpg 342w, /images/w780/poster.jpg 780w');
    expect(
      getPosterDisplaySrcSet(
        '/poster.jpg',
        '/small.jpg 1x, /large.jpg 2x, /full.jpg 3x'
      )
    ).toBe('/small.jpg 1x, /large.jpg 2x');
  });

  it('bounds cast and profile portraits without treating h632 as a width', () => {
    expect(getDisplaySrcSet(profileSrcSet)).toBe(
      '/images/w185/profile.jpg 1x, /images/h632/profile.jpg 2x'
    );
    expect(
      getPosterDisplaySrcSet('/images/w500/profile.jpg', profileSrcSet)
    ).toBe('/images/w185/profile.jpg 1x, /images/h632/profile.jpg 2x');
  });

  it('preserves standard and intermediate densities and excludes excessive density', () => {
    expect(
      getDisplaySrcSet(
        '/one.jpg 1x, /mid.jpg 1.5x, /two.jpg 2x, /three.jpg 3x, /four.jpg 4x'
      )
    ).toBe('/one.jpg 1x, /mid.jpg 1.5x, /two.jpg 2x');
  });

  it('leaves missing images and single-source thumbnails alone', () => {
    expect(getDisplaySrcSet()).toBeUndefined();
    expect(getPosterDisplaySrcSet()).toBeUndefined();
    expect(getPosterDisplaySrcSet('/images/w500/gallery.jpg')).toBeUndefined();
  });
});
