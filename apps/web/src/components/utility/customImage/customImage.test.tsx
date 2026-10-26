import { fireEvent, render, screen } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import MovieImage from './customImage';

function LoadImageDuringLayout() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const image = containerRef.current?.querySelector('img');
    image?.dispatchEvent(new Event('load'));
  }, []);

  return (
    <div ref={containerRef}>
      <MovieImage
        src="/cached.jpg"
        previewSrc="/cached-preview.jpg"
        alt="Cached poster"
        className="movie-image"
      />
    </div>
  );
}

describe('<MovieImage />', () => {
  it.each(['preview', 'final'])(
    'handles %s loading first without delaying the final request',
    (first) => {
      const imageConstructor = vi.spyOn(window, 'Image');
      const { container } = render(
        <MovieImage
          src="/poster.jpg"
          previewSrc="/preview.jpg"
          loading="eager"
          alt="Poster"
          className="movie-image"
        />
      );
      const final = screen.getByAltText('Poster');
      const preview = container.querySelector('.image-preview');

      if (!preview) {
        throw new Error('Missing preview');
      }
      expect(final).toHaveAttribute('src', '/poster.jpg');
      expect(final).toHaveAttribute('loading', 'eager');
      expect(final).toHaveAttribute('decoding', 'async');
      expect(preview).toHaveAttribute('src', '/preview.jpg');
      expect(preview).toHaveAttribute('aria-hidden', 'true');
      expect(preview).toHaveAttribute('alt', '');
      expect(imageConstructor).not.toHaveBeenCalled();
      fireEvent.load(first === 'preview' ? preview : final);
      expect(final).toHaveStyle({ opacity: first === 'final' ? '1' : '0' });
      expect(preview).toHaveStyle({ opacity: first === 'preview' ? '1' : '0' });
      fireEvent.load(first === 'preview' ? final : preview);
      expect(final).toHaveStyle({ opacity: '1' });
      expect(preview).toHaveStyle({ opacity: '0' });
      imageConstructor.mockRestore();
    }
  );

  it('keeps preview and final failures independent and preserves the fallback', () => {
    const { container } = render(
      <MovieImage
        src="/poster.jpg"
        srcSet="/large.jpg 2x"
        previewSrc="/preview.jpg"
        alt="Poster"
        className="movie-image"
      />
    );
    const final = screen.getByAltText('Poster');
    const preview = container.querySelector('.image-preview');

    if (!preview) {
      throw new Error('Missing preview');
    }
    fireEvent.error(preview);
    expect(final).toHaveAttribute('src', '/poster.jpg');
    expect(preview).toHaveStyle({ opacity: '0' });
    fireEvent.load(final);
    expect(final).toHaveStyle({ opacity: '1' });
    fireEvent.error(final);
    fireEvent.load(preview);
    expect(screen.getByRole('img', { name: 'Poster' })).toHaveClass(
      'image-placeholder'
    );
    expect(screen.queryByAltText('Poster')).toBeNull();
    expect(container.querySelector('.image-preview')).toBeNull();
  });

  it('isolates both image states across preview and final source changes', () => {
    const props = {
      src: '/poster.jpg',
      alt: 'Poster',
      className: 'movie-image',
    };
    const { container, rerender } = render(
      <MovieImage {...props} previewSrc="/first.jpg" />
    );
    const first = container.querySelector('.image-preview');

    if (!first) {
      throw new Error('Missing preview');
    }
    fireEvent.load(first);
    rerender(<MovieImage {...props} previewSrc="/second.jpg" />);
    const second = container.querySelector('.image-preview');

    if (!second) {
      throw new Error('Missing preview');
    }
    fireEvent.load(first);
    expect(second).toHaveStyle({ opacity: '0' });
    fireEvent.load(second);
    expect(second).toHaveStyle({ opacity: '1' });
    rerender(<MovieImage {...props} src="/next.jpg" previewSrc="/third.jpg" />);
    fireEvent.error(second);
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
    const third = container.querySelector('.image-preview');

    if (!third) {
      throw new Error('Missing preview');
    }
    fireEvent.load(third);
    expect(third).toHaveStyle({ opacity: '1' });
  });

  it('renders the accessible icon placeholder when no source is provided', () => {
    render(<MovieImage alt="Poster" className="movie-image" />);
    const placeholder = screen.getByRole('img', { name: 'Poster' });
    expect(placeholder).toHaveClass(
      'movie-image__placeholder',
      'image-placeholder'
    );
    expect(placeholder.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(placeholder).not.toHaveTextContent(/no image available/i);
  });

  it('keeps the missing-image placeholder out of the loading state', () => {
    const imageConstructor = vi.spyOn(window, 'Image');
    render(
      <MovieImage src="/poster.jpg" alt="Poster" className="movie-image" />
    );
    const image = screen.getByAltText('Poster');
    expect(image).toHaveAttribute('src', '/poster.jpg');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(imageConstructor).not.toHaveBeenCalled();
    expect(screen.queryByRole('img', { name: 'Poster' })).toBe(image);
    fireEvent.load(image);
    expect(image).toHaveStyle({ opacity: '1' });
    imageConstructor.mockRestore();
  });

  it('keeps a successful load that arrives before passive effects run', () => {
    render(<LoadImageDuringLayout />);
    expect(screen.getByAltText('Cached poster')).toHaveStyle({ opacity: '1' });
  });

  it('supports explicit eager loading and responsive candidates', () => {
    render(
      <MovieImage
        src="/poster.jpg"
        srcSet="/small.jpg 300w, /large.jpg 780w"
        sizes="300px"
        loading="eager"
        alt="Poster"
        className="movie-image"
      />
    );
    const image = screen.getByAltText('Poster');
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('srcset', '/small.jpg 300w, /large.jpg 780w');
    expect(image).toHaveAttribute('sizes', '300px');
  });

  it('clears candidates on failure and does not retry a broken fallback', () => {
    render(
      <MovieImage
        src="/broken.jpg"
        srcSet="/broken-large.jpg 2x"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const image = screen.getByAltText('Poster');
    fireEvent.error(image);
    const fallback = screen.getByRole('img', { name: 'Poster' });
    expect(fallback).toHaveClass('image-placeholder');
    expect(fallback.querySelector('svg')).toBeInTheDocument();
  });

  it('ignores stale events and recovers across rapid source and sizes changes', () => {
    const { rerender } = render(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    const oldImage = screen.getByAltText('Poster');
    fireEvent.error(oldImage);
    rerender(
      <MovieImage
        src="/next.jpg"
        sizes="200px"
        alt="Poster"
        className="movie-image"
      />
    );
    const nextImage = screen.getByAltText('Poster');
    expect(screen.getByAltText('Poster')).toHaveAttribute('src', '/next.jpg');
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
    rerender(
      <MovieImage
        src="/last.jpg"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const lastImage = screen.getByAltText('Poster');
    fireEvent.load(nextImage);
    expect(lastImage).toHaveStyle({ opacity: '0' });
    fireEvent.load(lastImage);
    expect(lastImage).toHaveStyle({ opacity: '1' });
    rerender(
      <MovieImage
        src="/last.jpg"
        srcSet="/last-large.jpg 2x"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const responsiveImage = screen.getByAltText('Poster');
    fireEvent.error(responsiveImage);
    expect(screen.getByRole('img', { name: 'Poster' })).toHaveClass(
      'image-placeholder'
    );
    fireEvent.error(oldImage);
    rerender(
      <MovieImage
        src="/recovered.jpg"
        srcSet="/recovered-large.jpg 2x"
        sizes="300px"
        alt="Poster"
        className="movie-image"
      />
    );
    const recoveredImage = screen.getByAltText('Poster');
    expect(recoveredImage).toHaveAttribute('src', '/recovered.jpg');
    expect(recoveredImage).toHaveStyle({ opacity: '0' });
    fireEvent.load(recoveredImage);
    expect(recoveredImage).toHaveStyle({ opacity: '1' });
    expect(screen.getByAltText('Poster')).toHaveAttribute(
      'srcset',
      '/recovered-large.jpg 2x'
    );
  });

  it('resets loaded state when a source changes away and back quickly', () => {
    const { rerender } = render(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    const firstImage = screen.getByAltText('Poster');
    fireEvent.load(firstImage);
    expect(firstImage).toHaveStyle({ opacity: '1' });

    rerender(
      <MovieImage src="/temporary.jpg" alt="Poster" className="movie-image" />
    );
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
    rerender(
      <MovieImage src="/first.jpg" alt="Poster" className="movie-image" />
    );
    expect(screen.getByAltText('Poster')).toHaveStyle({ opacity: '0' });
  });
});
