import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import type { HtmlTagDescriptor, Plugin } from 'vite';

import {
  publicImage,
  siteDescription,
  siteOrigin,
  siteTitle,
} from './src/seo/metadata';

let releaseOrigin: string | undefined;
let releaseImage: string | undefined;

const releaseSeo: Plugin = {
  name: 'release-seo',
  configResolved(config) {
    releaseOrigin = siteOrigin(config.env.VITE_SITE_URL);
    releaseImage = publicImage(config.env.VITE_SOCIAL_IMAGE_URL);

    if (config.env.VITE_SOCIAL_IMAGE_URL && !releaseImage) {
      throw new Error('VITE_SOCIAL_IMAGE_URL must be an absolute HTTP(S) URL');
    }
  },
  transformIndexHtml() {
    // Shared SPA HTML must not claim every detail/search URL is the homepage.
    const tags: HtmlTagDescriptor[] = [
      { tag: 'meta', attrs: { property: 'og:site_name', content: siteTitle } },
      { tag: 'meta', attrs: { property: 'og:title', content: siteTitle } },
      {
        tag: 'meta',
        attrs: { property: 'og:description', content: siteDescription },
      },
      { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
      { tag: 'meta', attrs: { name: 'twitter:title', content: siteTitle } },
      {
        tag: 'meta',
        attrs: { name: 'twitter:description', content: siteDescription },
      },
      {
        tag: 'meta',
        attrs: {
          name: 'twitter:card',
          content: releaseImage ? 'summary_large_image' : 'summary',
        },
      },
    ];

    if (!releaseOrigin) {
      tags.push({
        tag: 'meta',
        attrs: { name: 'robots', content: 'noindex, follow' },
      });
    }
    if (releaseImage) {
      tags.push(
        { tag: 'meta', attrs: { property: 'og:image', content: releaseImage } },
        {
          tag: 'meta',
          attrs: { property: 'og:image:alt', content: siteTitle },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: releaseImage },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image:alt', content: siteTitle },
        }
      );
    }

    return tags;
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: releaseOrigin
        ? `User-agent: *\nAllow: /\nSitemap: ${releaseOrigin}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n',
    });

    if (releaseOrigin) {
      const escapedOrigin = releaseOrigin
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapedOrigin}/</loc></url></urlset>\n`,
      });
    }
  },
};

// Explicit inputs cover new files as well as files read by the tools.
const cache = {
  env: ['NODE_ENV', 'TZ', 'VITE_*'],
  input: [
    'src/**',
    'public/**',
    '*',
    '.*',
    { pattern: 'package.json', base: 'workspace' as const },
    { pattern: 'package-lock.json', base: 'workspace' as const },
    { pattern: 'packages/contracts/src/**', base: 'workspace' as const },
    { pattern: 'packages/contracts/*.json', base: 'workspace' as const },
  ],
  output: [],
};

export default defineConfig({
  run: {
    tasks: {
      'task:dev': { command: 'npm run dev', cache: false },
      'task:build': {
        command: 'npm run build',
        dependsOn: ['@movie-explorer/contracts#task:build'],
        cache: { ...cache, output: ['dist/**'] },
      },
      'task:lint': {
        command: 'npm run lint',
        dependsOn: ['@movie-explorer/contracts#task:lint'],
        cache,
      },
      'task:typecheck': {
        command: 'npm run typecheck',
        dependsOn: ['@movie-explorer/contracts#task:typecheck'],
        cache,
      },
      'task:test': { command: 'npm test', cache },
      'task:coverage': {
        command: 'npm run test:coverage',
        cache: { ...cache, output: ['coverage/**'] },
      },
    },
  },
  plugins: [releaseSeo, lazyPlugins(() => [react()])],
  css: {
    postcss: {
      plugins: [autoprefixer({})],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/index.tsx', 'src/vite-env.d.ts'],
    },
  },
});
