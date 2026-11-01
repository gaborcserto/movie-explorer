const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function load(name) {
  const context = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, '../edge', name), 'utf8'),
    context,
  );

  return context.handler;
}

const rewrite = load('spa-request.js');
const responseHeaders = load('seo-response.js');

function request(uri, options = {}) {
  return {
    uri,
    method: 'GET',
    querystring: {},
    headers: { accept: { value: 'text/html' } },
    ...options,
  };
}

for (const uri of [
  '/',
  '/movie/550',
  '/series/1396',
  '/series/1396/seasons/1',
  '/series/1396/seasons/1/episodes/1',
  '/person/6193',
  '/tv/1396',
  '/library',
  '/search/Mr.%20Bean',
]) {
  test(`serves browser deep link ${uri}`, () => {
    assert.equal(rewrite({ request: request(uri) }).uri, '/index.html');
  });
}

for (const uri of [
  '/assets/missing.js',
  '/movie/missing.css',
  '/search/missing.js',
  '/robots.txt',
  '/sitemap.xml',
  '/missing.png',
  '/api/v1/movies/550',
  '/api/health',
  '/unrecognized-route',
]) {
  test(`does not rewrite ${uri}`, () => {
    assert.equal(rewrite({ request: request(uri) }).uri, uri);
  });
}

test('does not rewrite non-document requests or mutations', () => {
  assert.equal(
    rewrite({ request: request('/movie/550', { headers: {} }) }).uri,
    '/movie/550',
  );
  assert.equal(
    rewrite({ request: request('/movie/550', { method: 'POST' }) }).uri,
    '/movie/550',
  );
});

for (const uri of [
  '/search',
  '/search/inception',
  '/library',
  '/series/1396/seasons/1',
  '/series/1396/seasons/1/episodes/1',
]) {
  test(`sends initial noindex after rewriting ${uri}`, () => {
    const rewritten = rewrite({ request: request(uri) });
    const response = responseHeaders({
      request: rewritten,
      response: { statusCode: 200, headers: {} },
    });
    assert.equal(response.headers['x-robots-tag'].value, 'noindex, follow');
  });
}

test('excludes query variants and ignores spoofed noindex markers', () => {
  const queried = rewrite({
    request: request('/movie/550', { querystring: { page: { value: '2' } } }),
  });
  assert.equal(
    responseHeaders({ request: queried, response: { headers: {} } }).headers[
      'x-robots-tag'
    ].value,
    'noindex, follow',
  );
  const clean = request('/movie/550');
  clean.headers['x-movie-noindex'] = { value: 'true' };
  const rewritten = rewrite({ request: clean });
  assert.equal(
    responseHeaders({ request: rewritten, response: { headers: {} } }).headers[
      'x-robots-tag'
    ],
    undefined,
  );
});
