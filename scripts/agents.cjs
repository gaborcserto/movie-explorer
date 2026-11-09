const { readFileSync, readdirSync, existsSync } = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

function validate(root) {
  const errors = [];
  const names = new Set();
  const documents = ['AGENTS.md', 'docs/agent-engineering.md'];
  const skills = path.join(root, '.agents/skills');

  for (const entry of readdirSync(skills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = `.agents/skills/${entry.name}/SKILL.md`;

    if (!existsSync(path.join(root, file))) {
      errors.push(`${file}: missing skill`);
      continue;
    }
    const source = readFileSync(path.join(root, file), 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

    try {
      const metadata = YAML.parse(match?.[1] || '');

      if (
        !metadata ||
        metadata.name !== entry.name ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name) ||
        typeof metadata.description !== 'string' ||
        !metadata.description.trim()
      )
        errors.push(`${file}: invalid name or description`);
      if (names.has(metadata?.name))
        errors.push(`${file}: duplicate identifier`);
      names.add(metadata?.name);
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }

  function collect(directory) {
    for (const entry of readdirSync(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const file = `${directory}/${entry.name}`;

      if (entry.isDirectory()) collect(file);
      else if (file.endsWith('.md')) documents.push(file);
    }
  }

  collect('.agents');
  const scripts = JSON.parse(
    readFileSync(path.join(root, 'package.json'), 'utf8'),
  ).scripts;

  for (const file of documents) {
    const source = readFileSync(path.join(root, file), 'utf8');

    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];

      if (!target || /^[a-z]+:/i.test(target)) continue;
      const resolved = path.resolve(root, path.dirname(file), target);
      const relative = path.relative(root, resolved);

      if (
        relative.startsWith('..') ||
        path.isAbsolute(relative) ||
        !existsSync(resolved)
      ) {
        errors.push(`${file}: invalid local reference ${target}`);
      }
    }
    for (const match of source.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) {
      const line = source.slice(match.index).split('\n')[0];

      if (line.includes('--workspace') || line.includes('--prefix')) continue;
      if (!(match[1] in scripts))
        errors.push(`${file}: unknown root script ${match[1]}`);
    }
  }

  return errors;
}

module.exports = { validate };
if (require.main === module) {
  const errors = validate(path.resolve(__dirname, '..'));
  errors.forEach((error) => console.error(error));
  console.log(`Agent validation: ${errors.length ? 'FAIL' : 'PASS'}`);
  process.exitCode = errors.length ? 1 : 0;
}
