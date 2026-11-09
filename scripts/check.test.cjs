const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const {
  mkdtempSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  rmSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const { select, changed, commands } = require('./check.cjs');

test('selects complete workspace suites and propagates contracts conservatively', () => {
  assert.deepEqual(select([]), []);
  assert.deepEqual(select(['apps/web/src/a.ts']), ['apps/web']);
  assert.deepEqual(select(['apps/api/src/a.ts']), ['apps/api']);
  assert.deepEqual(select(['apps/web/deleted.ts', 'apps/api/new.ts']), [
    'apps/web',
    'apps/api',
  ]);
  assert.deepEqual(select(['packages/contracts/src/index.ts']), [
    'apps/web',
    'apps/api',
    'packages/contracts',
  ]);
  for (const file of [
    'package.json',
    'unknown/file',
    'apps/web/package.json',
    '.github/workflows/ci.yml',
  ]) {
    assert.equal(select([file]).length, 4);
  }
  assert.ok(
    commands(['apps/api'], false).some((args) => args.includes('test:e2e')),
  );
  assert.deepEqual(commands([], false), []);
});

test('an unavailable comparison base plans all quality gates', () => {
  const output = execFileSync(
    process.execPath,
    [
      path.join(__dirname, 'check.cjs'),
      '--base',
      'refs/heads/missing-selection-fixture',
      '--dry-run',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  assert.match(output, /Full verification or conservative fallback/);
  assert.match(output, /audit/);
  assert.match(output, /test:e2e/);
});

test('detects staged, unstaged, untracked, renamed, deleted and committed paths', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'movie-check-'));

  const git = (...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });

  const write = (name, value = name) =>
    writeFileSync(path.join(cwd, name), value);

  try {
    git('init');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Selection Test');
    for (const name of ['staged', 'unstaged', 'rename', 'delete']) write(name);
    git('add', '.');
    git('commit', '-m', 'fixture');
    const base = git('rev-parse', 'HEAD').toString().trim();
    assert.deepEqual(changed(undefined, cwd), []);
    write('committed');
    git('add', '.');
    git('commit', '-m', 'committed fixture');
    write('staged', 'changed');
    git('add', 'staged');
    write('unstaged', 'changed');
    write('untracked space');
    renameSync(path.join(cwd, 'rename'), path.join(cwd, 'renamed'));
    unlinkSync(path.join(cwd, 'delete'));
    assert.deepEqual(changed(base, cwd), [
      'committed',
      'delete',
      'rename',
      'renamed',
      'staged',
      'unstaged',
      'untracked space',
    ]);
    assert.throws(() => changed('missing-ref', cwd));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
