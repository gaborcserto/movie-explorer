const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const { validate } = require('./agents.cjs');

test('validates metadata, local references and command references with useful failures', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'movie-agents-'));

  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };

  try {
    write(
      'package.json',
      JSON.stringify({ scripts: { 'check:all': 'fixture' } }),
    );
    write('AGENTS.md', '[workflow](.agents/workflows/review.md)');
    write('docs/agent-engineering.md', 'npm run check:all');
    write('.agents/workflows/review.md', '[skill](../skills/example/SKILL.md)');
    write(
      '.agents/skills/example/SKILL.md',
      '---\nname: example\ndescription: Example skill\n---\n',
    );
    assert.deepEqual(validate(root), []);
    write(
      '.agents/skills/example/SKILL.md',
      '---\nname: example\ndescription: Example skill\n---invalid\n',
    );
    assert.ok(
      validate(root).some((error) =>
        error.includes('invalid name or description'),
      ),
    );
    write(
      '.agents/skills/example/SKILL.md',
      '---\nname: example\ndescription: Example skill\n---\n',
    );

    write(
      'AGENTS.md',
      '[missing](missing.md)\n[escape](../outside.md)\nnpm run nonexistent',
    );
    write(
      '.agents/skills/example/SKILL.md',
      '---\nname: wrong\ndescription: 42\n---\n',
    );
    mkdirSync(path.join(root, '.agents/skills/empty'));
    const errors = validate(root).join('\n');

    assert.match(errors, /missing skill/);
    assert.match(errors, /invalid name or description/);
    assert.match(errors, /invalid local reference missing.md/);
    assert.match(errors, /invalid local reference ..\/outside.md/);
    assert.match(errors, /unknown root script nonexistent/);
    write('.agents/skills/example/SKILL.md', '---\nname: [invalid\n---\n');
    assert.ok(validate(root).some((error) => error.includes('SKILL.md')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
