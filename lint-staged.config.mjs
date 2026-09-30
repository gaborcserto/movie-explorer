import path from 'node:path';

const quote = (file) => `"${file.replaceAll('"', '\\"')}"`;

const runWorkspaceCommands = (workspace, commands, files) => {
  const workspaceRoot = path.resolve('apps', workspace);
  const relativeFiles = files.map((file) => path.relative(workspaceRoot, file));
  const quotedFiles = relativeFiles.map(quote).join(' ');

  return commands.map(
    (command) =>
      `npm exec --workspace @movie-explorer/${workspace} -- ${command} ${quotedFiles}`,
  );
};

export default {
  'apps/web/**/*.{js,jsx,ts,tsx}': (files) =>
    runWorkspaceCommands(
      'web',
      ['eslint --max-warnings=0', 'prettier --write'],
      files,
    ),
  'apps/api/**/*.{js,jsx,ts,tsx}': (files) =>
    runWorkspaceCommands(
      'api',
      ['eslint --max-warnings=0', 'prettier --write'],
      files,
    ),
  'apps/web/**/*.{css,scss}': (files) =>
    runWorkspaceCommands('web', ['stylelint'], files),
};
