import path from 'node:path';

const quote = (file) => `"${file.replaceAll('"', '\\"')}"`;

const runWorkspaceCommands = (workspace, files) => {
  const workspaceRoot = path.resolve('apps', workspace);
  const relativeFiles = files.map((file) => path.relative(workspaceRoot, file));
  const lintFiles = relativeFiles.filter(
    (file) =>
      /\.(js|jsx|ts|tsx)$/.test(file) &&
      (workspace === 'web' ||
        ((file.startsWith(`src${path.sep}`) ||
          file.startsWith(`test${path.sep}`)) &&
          path.basename(file) !== 'setupTests.ts' &&
          !file.split(path.sep).includes('__mocks__'))),
  );
  const commands = [];
  const oxlintFiles = lintFiles.filter(
    (file) => workspace === 'api' || file.startsWith(`src${path.sep}`),
  );

  if (oxlintFiles.length > 0) {
    const quotedOxlintFiles = oxlintFiles.map(quote).join(' ');
    commands.push(
      `vp lint -c .oxlintrc.json --max-warnings=0 ${quotedOxlintFiles}`,
    );
  }

  if (lintFiles.length > 0) {
    const quotedLintFiles = lintFiles.map(quote).join(' ');
    commands.push(`eslint --max-warnings=0 ${quotedLintFiles}`);
  }

  if (relativeFiles.length > 0) {
    const quotedFiles = relativeFiles.map(quote).join(' ');
    commands.push(`vp fmt -c .oxfmtrc.json --write ${quotedFiles}`);
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

    return [
      `npm exec --workspace @movie-explorer/web -- vp fmt -c .oxfmtrc.json --write ${quotedFiles}`,
      `npm exec --workspace @movie-explorer/web -- stylelint ${quotedFiles}`,
    ];
  },
};
