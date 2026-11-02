const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { test, before, after } = require('node:test');
const os = require('node:os');
const http = require('node:http');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');

const artifact = path.resolve(__dirname, '../.artifacts/lambda');
let isolatedArtifact;

// Fetch blocks some valid ephemeral ports (for example SIP ports on Windows).
// Native HTTP tests the listener without browser-specific blocked-port rules.
function get(url, body) {
  return new Promise((resolve, reject) => {
    const outgoing = http
      .request(
        url,
        {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://foreign.invalid',
          },
        },
        (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () =>
            resolve(
              new Response(Buffer.concat(chunks), {
                status: response.statusCode,
                headers: response.headers,
              }),
            ),
          );
          response.on('error', reject);
        },
      )
      .on('error', reject);
    outgoing.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

before(() => {
  isolatedArtifact = fs.mkdtempSync(
    path.join(os.tmpdir(), 'movie-explorer-lambda-'),
  );
  fs.cpSync(artifact, isolatedArtifact, { recursive: true });
});

after(() => {
  if (
    path.dirname(isolatedArtifact) !== path.resolve(os.tmpdir()) ||
    !path.basename(isolatedArtifact).startsWith('movie-explorer-lambda-')
  ) {
    throw new Error('Unexpected temporary artifact path');
  }
  fs.rmSync(isolatedArtifact, { recursive: true, force: true });
});

test('ZIP has executable Linux launcher and excludes local credentials and tooling', () => {
  const zip = fs.readFileSync(path.resolve(artifact, '../backend.zip'));
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  let offset = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  const entries = new Map();

  for (let index = 0; index < count; index += 1) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50);
    const nameLength = zip.readUInt16LE(offset + 28);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.set(name, zip.readUInt32LE(offset + 38) >>> 16);
    offset +=
      46 +
      nameLength +
      zip.readUInt16LE(offset + 30) +
      zip.readUInt16LE(offset + 32);
  }

  assert.equal(entries.get('run.sh') & 0o777, 0o755);
  assert.ok(entries.has('apps/api/dist/main.js'));
  assert.equal(
    [...entries.keys()].some((name) =>
      /(^|\/)\.env(?:\.|$)|node_modules\/(typescript|jest)\//.test(name),
    ),
    false,
  );
});

test(
  'production artifact starts in isolation and preserves HTTP behavior',
  { timeout: 30000 },
  async () => {
    const listener = net.createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
      cwd: isolatedArtifact,
      env: {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(port),
        TMDB_ACCESS_TOKEN: 'offline-smoke-placeholder',
        TMDB_API_BASE_URL: 'http://127.0.0.1:1/3',
        TMDB_REQUEST_TIMEOUT_MS: '50',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });
    child.stderr.on('data', (data) => {
      output += data;
    });
    const base = `http://127.0.0.1:${port}`;

    try {
      let ready = false;

      for (let attempt = 0; attempt < 100; attempt += 1) {
        const response = await get(`${base}/health`).catch(() => undefined);

        if (response?.ok) {
          ready = true;
          break;
        }
        if (child.exitCode !== null) {
          break;
        }
        await delay(100);
      }

      assert.equal(ready, true, output);

      for (const route of ['/health', '/api/health']) {
        const response = await get(base + route);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: 'ok' });
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('x-powered-by'), null);
        assert.equal(response.headers.get('access-control-allow-origin'), null);
      }

      for (const route of ['/api-docs', '/api-docs-json', '/api/missing']) {
        assert.equal((await get(base + route)).status, 404);
      }

      const invalid = await get(`${base}/api/v1/movies/invalid`);
      assert.equal(invalid.status, 400);
      const failure = await get(`${base}/api/v1/movies/550`);
      assert.ok([502, 503, 504].includes(failure.status));
      assert.equal(
        (await failure.text()).includes('offline-smoke-placeholder'),
        false,
      );
      assert.equal(output.includes('offline-smoke-placeholder'), false);

      const preferences = {
        mediaType: 'movie',
        favoriteIds: [1],
        excludedIds: [],
      };
      const personalized = await get(
        `${base}/api/v1/recommendations/personalized`,
        preferences,
      );
      assert.equal(personalized.status, 502);
      assert.equal(
        personalized.headers.get('cache-control'),
        'private, no-store',
      );
      assert.equal(
        (await personalized.text()).includes('offline-smoke-placeholder'),
        false,
      );

      for (const invalidBody of [
        { ...preferences, favoriteIds: [1, 2, 3, 4] },
        {
          ...preferences,
          excludedIds: Array.from({ length: 1001 }, (_, index) => index + 1),
        },
        { ...preferences, token: 'unexpected-field' },
        { ...preferences, mediaType: 'person' },
      ]) {
        assert.equal(
          (
            await get(
              `${base}/api/v1/recommendations/personalized`,
              invalidBody,
            )
          ).status,
          400,
        );
      }
      assert.equal(output.includes('offline-smoke-placeholder'), false);
      assert.equal(
        fs.readFileSync(path.join(artifact, 'run.sh'), 'utf8').includes('\r'),
        false,
      );
      assert.equal(fs.existsSync(path.join(artifact, 'apps/api/.env')), false);
      assert.equal(
        fs.existsSync(path.join(artifact, 'node_modules/typescript')),
        false,
      );
    } finally {
      const stopped = once(child, 'exit');
      child.kill();
      await stopped;
    }
  },
);

test(
  'production artifact rejects missing credentials without local environment leakage',
  { timeout: 10000 },
  async () => {
    const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
      cwd: isolatedArtifact,
      env: {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        NODE_ENV: 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });
    child.stderr.on('data', (data) => {
      output += data;
    });
    const [code] = await once(child, 'exit');
    assert.notEqual(code, 0);
    assert.match(output, /Missing required TMDB_ACCESS_TOKEN/);
  },
);
