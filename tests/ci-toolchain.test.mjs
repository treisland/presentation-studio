import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateToolchain } from '../scripts/ci-toolchain.mjs';

const read = name => JSON.parse(readFileSync(new URL('../' + name, import.meta.url), 'utf8'));
const config = read('.github/playwright-image.json');
const pkg = read('package.json');
const lock = read('package-lock.json');

test('CI browser image matches the installed package and browser engine lock', () => {
  assert.equal(validateToolchain(config, pkg, lock), config);
  const changed = structuredClone(lock);
  changed.packages['node_modules/playwright-core'].version = '0.0.0';
  assert.throws(() => validateToolchain(config, pkg, changed), /together/);
  assert.throws(() => validateToolchain(config, {...pkg, devDependencies: {playwright: '^1.62.1'}}, lock), /together/);
});

test('CI rejects unpinned or unrelated container images', () => {
  for (const image of [config.image.split('@')[0], config.image.replace('mcr.microsoft.com', 'example.com')]) {
    assert.throws(() => validateToolchain({...config, image}, pkg, lock), /digest-pinned/);
  }
});
