import path from 'node:path';

const quote = (file) => `"${file.replaceAll('"', '\\"')}"`;

const runWorkspaceCommands = (workspace, files) => {
  const workspaceRoot = path.resolve('apps', workspace);
  const relativeFiles = files.map((file) => path.relative(workspaceRoot, file));
  const lintFiles = relativeFiles.filter(
    (file) =>
      /\.(js|jsx|ts|tsx)$/.test(file) &&
      (file.startsWith(`src${path.sep}`) ||
        (workspace === 'api' && file.startsWith(`test${path.sep}`))) &&
      path.basename(file) !== 'setupTests.ts' &&
      !file.split(path.sep).includes('__mocks__'),
  );
  const commands = [];

  if (lintFiles.length > 0) {
    const quotedLintFiles = lintFiles.map(quote).join(' ');
    commands.push(
      `vp lint -c .oxlintrc.json --max-warnings=0 ${quotedLintFiles}`,
      `eslint --max-warnings=0 ${quotedLintFiles}`,
    );
  }

  if (relativeFiles.length > 0) {
    const quotedFiles = relativeFiles.map(quote).join(' ');
    const formatter = workspace === 'web'
      ? 'prettier --write'
      : 'vp fmt -c .oxfmtrc.json --write';
    commands.push(`${formatter} ${quotedFiles}`);
  }

  return commands.map(
    (command) =>
      `npm exec --workspace @movie-explorer/${workspace} -- ${command}`,
  );
};

export default {
  'apps/web/**/*.{js,jsx,ts,tsx}': (files) =>
    runWorkspaceCommands('web', files),
  'apps/api/**/*.{js,jsx,ts,tsx}': (files) =>
    runWorkspaceCommands('api', files),
  'apps/web/**/*.{css,scss}': (files) => {
    const workspaceRoot = path.resolve('apps/web');
    const relativeFiles = files.map((file) => path.relative(workspaceRoot, file));
    const quotedFiles = relativeFiles.map(quote).join(' ');
    return [`npm exec --workspace @movie-explorer/web -- stylelint ${quotedFiles}`];
  },
};
