const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ZipFile } = require('yazl');

const root = path.resolve(__dirname, '../../..');
const output = path.join(root, 'infrastructure/aws/.artifacts/lambda');

if (output !== path.resolve(root, 'infrastructure/aws/.artifacts/lambda')) {
  throw new Error('Unexpected artifact directory');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

// Explicit allowlist: no source environment files, source tests or credentials.
for (const file of [
  'package.json',
  'package-lock.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/contracts/package.json',
  'infrastructure/aws/package.json',
]) {
  const destination = path.join(output, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, file), destination);
}

fs.cpSync(
  path.join(root, 'apps/api/dist'),
  path.join(output, 'apps/api/dist'),
  {
    recursive: true,
    filter: (source) =>
      fs.statSync(source).isDirectory() || source.endsWith('.js'),
  },
);
fs.cpSync(
  path.join(root, 'packages/contracts/dist'),
  path.join(output, 'packages/contracts/dist'),
  { recursive: true },
);

if (!process.env.npm_execpath) {
  throw new Error('Run packaging through npm run aws:package');
}

execFileSync(
  process.execPath,
  [
    process.env.npm_execpath,
    'ci',
    '--omit=dev',
    '--ignore-scripts',
    '--workspace',
    '@movie-explorer/api',
    '--include-workspace-root=false',
  ],
  {
    cwd: output,
    stdio: 'inherit',
  },
);

fs.writeFileSync(
  path.join(output, 'run.sh'),
  '#!/bin/sh\nset -eu\ncd "${LAMBDA_TASK_ROOT:-.}"\nexec node apps/api/dist/main.js\n',
  { mode: 0o755 },
);

const zip = new ZipFile();
let bytes = 0;

function addDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      addDirectory(file);
    } else if (entry.isFile()) {
      const name = path.relative(output, file).split(path.sep).join('/');
      bytes += fs.statSync(file).size;
      zip.addFile(file, name, {
        mode: name === 'run.sh' ? 0o100755 : 0o100644,
        mtime: new Date('2000-01-01T00:00:00Z'),
      });
    }
  }
}

addDirectory(output);

if (bytes > 200 * 1024 * 1024) {
  throw new Error(
    'Artifact exceeds the 200 MiB allowance (reserve space for the adapter layer)',
  );
}

const destination = fs.createWriteStream(
  path.resolve(output, '../backend.zip'),
);
zip.outputStream.on('error', (error) => {
  throw error;
});
destination.on('error', (error) => {
  throw error;
});
destination.on('close', () =>
  console.log(
    `Lambda ZIP ready (${bytes} uncompressed bytes); run.sh has Unix mode 755`,
  ),
);

zip.outputStream.pipe(destination);
zip.end();
