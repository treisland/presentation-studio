import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'));

export function validateToolchain(config, pkg, lock) {
  const match = /^mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble@sha256:[a-f0-9]{64}$/.exec(config.image);
  if (!match || config.nodeMajor !== 22) throw Error('CI requires a digest-pinned official Playwright image and Node 22.');
  const versions = [pkg.devDependencies?.playwright, lock.packages?.['']?.devDependencies?.playwright,
    lock.packages?.['node_modules/playwright']?.version, lock.packages?.['node_modules/playwright-core']?.version];
  if (versions.some(version => version !== match[1])) throw Error('Update the Playwright package, lockfile and CI image together.');
  return config;
}

export function runLinuxCI() {
  const config = validateToolchain(json('.github/playwright-image.json'), json('package.json'), json('package-lock.json'));
  if (process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) !== config.nodeMajor) {
    throw Error('Run Linux CI from Linux/WSL with Node 22 and Docker. Windows CI stays native.');
  }
  // Mount setup-node's whole distribution so npm's relative links resolve and
  // the image's bundled Node version cannot silently change our test runtime.
  const nodeRoot = dirname(dirname(realpathSync(process.execPath)));
  const result = spawnSync('docker', ['run', '--rm', '--init', '--ipc=host',
    '--user', `${process.getuid()}:${process.getgid()}`,
    '--mount', `type=bind,source=${root},target=/workspace`,
    '--mount', `type=bind,source=${nodeRoot},target=/ci-node,readonly`,
    '--workdir', '/workspace', '--env', 'CI=true', '--env', 'HOME=/tmp/ci-home',
    '--env', 'PATH=/ci-node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    config.image, 'sh', '-ec', 'mkdir -p "$HOME"; node --version; npm ci; npm run check; npm run package'],
  { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Linux CI container failed (${result.status ?? result.signal}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    validateToolchain(json('.github/playwright-image.json'), json('package.json'), json('package-lock.json'));
    console.log('Playwright package, lockfile and pinned CI image match.');
  } else runLinuxCI();
}
