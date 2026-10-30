export const siteTitle = 'Movie Explorer';
export const siteDescription =
  'Discover movies, series and people. Explore casts, filmographies, seasons, photos and watch providers with Movie Explorer.';

export function siteOrigin(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  const url = new URL(value);

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('VITE_SITE_URL must be an HTTP(S) origin without a path');
  }

  return url.origin;
}

export function publicImage(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function serializeJsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export interface Metadata {
  title: string;
  description?: string | null;
  canonical?: string;
  index?: boolean;
  image?: string | null;
  type?: string;
  schema?: Record<string, unknown>;
}

export function applyMetadata(metadata: Metadata) {
  const title =
    metadata.title === siteTitle
      ? siteTitle
      : `${metadata.title} | ${siteTitle}`;
  const description =
    metadata.description?.trim().slice(0, 200) || siteDescription;
  const image = publicImage(metadata.image);

  const meta = (key: string, content: string | undefined, property = false) => {
    const attribute = property ? 'property' : 'name';
    let element = document.head.querySelector<HTMLMetaElement>(
      `meta[${attribute}="${key}"]`
    );

    if (content === undefined) {
      element?.remove();

      return;
    }
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.append(element);
    }
    element.content = content;
  };

  document.title = title;
  meta('description', description);
  meta('robots', metadata.index ? 'index, follow' : 'noindex, follow');
  meta('og:site_name', siteTitle, true);
  meta('og:title', title, true);
  meta('og:description', description, true);
  meta('og:type', metadata.type ?? 'website', true);
  meta('og:url', metadata.canonical, true);
  meta('og:image', image, true);
  meta('og:image:alt', image ? metadata.title : undefined, true);
  meta('twitter:card', image ? 'summary_large_image' : 'summary');
  meta('twitter:title', title);
  meta('twitter:description', description);
  meta('twitter:image', image);
  meta('twitter:image:alt', image ? metadata.title : undefined);
  document.head.querySelector('link[rel="canonical"]')?.remove();

  if (metadata.canonical) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = metadata.canonical;
    document.head.append(link);
  }

  document.getElementById('route-structured-data')?.remove();

  if (metadata.schema) {
    const script = document.createElement('script');
    script.id = 'route-structured-data';
    script.type = 'application/ld+json';
    script.textContent = serializeJsonLd(metadata.schema);
    document.head.append(script);
  }
}
