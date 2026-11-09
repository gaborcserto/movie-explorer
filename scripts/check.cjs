const { execFileSync, spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const directories = [
  'apps/web',
  'apps/api',
  'packages/contracts',
  'infrastructure/aws',
];

function select(files) {
  const selected = new Set();

  for (const file of files) {
    const directory = directories.find((entry) => file.startsWith(`${entry}/`));

    if (!directory || file.endsWith('/package.json')) return directories;
    selected.add(directory);
  }
  // Propagate public workspace dependencies, including future consumers.
  let expanded = true;

  while (expanded) {
    expanded = false;
    const names = [...selected].map(
      (directory) =>
        JSON.parse(readFileSync(path.join(root, directory, 'package.json')))
          .name,
    );

    for (const directory of directories) {
      const manifest = JSON.parse(
        readFileSync(path.join(root, directory, 'package.json')),
      );
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
      };

      if (
        !selected.has(directory) &&
        names.some((name) => name in dependencies)
      ) {
        selected.add(directory);
        expanded = true;
      }
    }
  }

  return directories.filter((directory) => selected.has(directory));
}

function changed(base, cwd = root) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  const files = [
    ...git('diff', '--name-only', '-z', '--no-renames', 'HEAD', '--'),
    ...git('ls-files', '--others', '--exclude-standard', '-z'),
  ];

  if (base) {
    const mergeBase = execFileSync('git', ['merge-base', 'HEAD', base], {
      cwd,
      encoding: 'utf8',
    }).trim();
    files.push(
      ...git(
        'diff',
        '--name-only',
        '-z',
        '--no-renames',
        `${mergeBase}...HEAD`,
        '--',
      ),
    );
  }

  return [...new Set(files)].sort();
}

function commands(workspaces, full) {
  if (full)
    return [
      ['audit', '--omit=dev'],
      ...['lint', 'typecheck', 'coverage', 'build', 'test:e2e'].map((task) => [
        'run',
        task,
      ]),
    ];
  const checks = [];

  for (const directory of workspaces) {
    for (const task of ['lint', 'typecheck', 'test:coverage', 'build']) {
      const manifest = JSON.parse(
        readFileSync(path.join(root, directory, 'package.json')),
      );

      if (manifest.scripts[task])
        checks.push(['run', task, '--workspace', manifest.name]);
    }
  }
  if (workspaces.includes('apps/api')) checks.push(['run', 'test:e2e']);

  return checks;
}

function main() {
  const started = performance.now();
  const args = process.argv.slice(2);
  const allowed = new Set(['--all', '--dry-run', '--base']);

  for (let index = 0; index < args.length; index++) {
    if (!allowed.has(args[index]))
      throw new Error(`Unknown argument: ${args[index]}`);
    if (
      args[index] === '--base' &&
      (!args[++index] || args[index].startsWith('-'))
    )
      throw new Error('--base requires a Git ref');
  }
  let full = args.includes('--all');
  let files = [];

  if (!full) {
    try {
      files = changed(
        args.includes('--base') ? args[args.indexOf('--base') + 1] : undefined,
      );
    } catch (error) {
      console.error(
        `Git selection failed; running full verification: ${error.message}`,
      );
      full = true;
    }
  }
  const workspaces = full ? directories : select(files);
  full ||= workspaces.length === directories.length;
  const checks = commands(workspaces, full);
  console.log(
    JSON.stringify(
      {
        files,
        workspaces,
        checks,
        skipped: full
          ? []
          : directories.filter((entry) => !workspaces.includes(entry)),
        reason: full
          ? 'Full verification or conservative fallback'
          : 'Unchanged workspaces skipped; full affected suites selected',
      },
      null,
      2,
    ),
  );
  if (!args.includes('--dry-run')) {
    for (const args of checks) {
      const step = performance.now();
      const npmCli = process.env.npm_execpath;

      if (!npmCli)
        throw new Error(
          'Run verification through npm run check:changed or npm run check:all',
        );
      const result = spawnSync(process.execPath, [npmCli, ...args], {
        cwd: root,
        stdio: 'inherit',
      });
      console.log(
        `${args.join(' ')}: ${((performance.now() - step) / 1000).toFixed(2)}s`,
      );
      if (result.error || result.status !== 0) {
        process.exitCode = result.status || 1;
        break;
      }
    }
  }
  console.log(
    `${args.includes('--dry-run') ? 'PLAN' : process.exitCode ? 'FAIL' : 'PASS'}: ${((performance.now() - started) / 1000).toFixed(2)}s`,
  );
}

module.exports = { changed, select, commands };
if (require.main === module) main();
