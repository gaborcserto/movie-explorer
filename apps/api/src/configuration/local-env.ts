import * as fs from 'fs';
import * as path from 'path';

function parseEnvFile(filePath: string): NodeJS.ProcessEnv {
  let contents: string;

  try {
    // Singleton provider startup only; preserve local .env loading before serving requests.
    // nestjs-doctor-ignore-next-line performance/no-sync-io
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {};
    }

    throw error;
  }

  return contents.split(/\r?\n/).reduce<NodeJS.ProcessEnv>((env, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return env;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return env;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key) {
      return env;
    }

    env[key] = rawValue.replace(/^['"]|['"]$/g, '');

    return env;
  }, {});
}

export function loadLocalEnv(): NodeJS.ProcessEnv {
  const cwd = process.cwd();
  const envFiles = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, 'apps/api/.env'),
  ];

  return envFiles.reduce<NodeJS.ProcessEnv>(
    (env, filePath) => ({
      ...env,
      ...parseEnvFile(filePath),
    }),
    {},
  );
}
