import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredChecks, validated, validPlan, validAssets, eligiblePR, protectedDelivery } from '../scripts/delivery.mjs';

test('drafts, held PRs, requested changes and unapproved contributors cannot queue', () => {
  const pr = { labels: [], author: { login: 'treisland' }, isDraft: false };
  assert(eligiblePR(pr));
  assert(!eligiblePR({ ...pr, isDraft: true }));
  assert(!eligiblePR({ ...pr, labels: [{ name: 'hold' }] }));
  assert(!eligiblePR({ ...pr, reviewDecision: 'CHANGES_REQUESTED' }));
  assert(!eligiblePR({ ...pr, author: { login: 'contributor' } }));
  assert(eligiblePR({ ...pr, author: { login: 'contributor' }, labels: [{ name: 'auto-merge' }] }));
});

test('delivery cannot bypass missing or weakened branch protections', () => {
  const settings = { allow_auto_merge: true };
  const protection = {
    enforce_admins: { enabled: true }, required_status_checks: { strict: true, checks: requiredChecks.map(context => ({ context, app_id: 15368 })) },
    required_pull_request_reviews: {}, required_conversation_resolution: { enabled: true },
  };
  assert(protectedDelivery(settings, protection));
  assert(!protectedDelivery(settings, null));
  assert(!protectedDelivery({ allow_auto_merge: false }, protection));
  assert(!protectedDelivery(settings, { ...protection, allow_force_pushes: { enabled: true } }));
  assert(!protectedDelivery(settings, { ...protection, enforce_admins: { enabled: false } }));
});

test('delivery requires both platforms and rejects failed, missing, or pending checks', () => {
  const checks = requiredChecks.map(name => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS' }));
  assert(validated(checks));
  assert(!validated(checks.slice(1)));
  assert(!validated([...checks, { name: 'security', status: 'COMPLETED', conclusion: 'FAILURE' }]));
  assert(!validated([{ ...checks[0], status: 'IN_PROGRESS' }, checks[1]]));
});

test('release plans match versions and require manual evidence beyond alpha', () => {
  const plan = { publish: true, version: '0.2.0-alpha.1', notes: 'docs/releases/0.2.0-alpha.1.md' };
  assert(validPlan(plan, plan.version));
  assert(!validPlan({ publish: false }, 'anything'));
  assert.throws(() => validPlan(plan, '0.2.0-alpha.2'));
  for (const version of ['0.2.0-beta.1', '0.2.0-rc.1', '0.2.0']) {
    const next = { ...plan, version, notes: `docs/releases/${version}.md` };
    assert.throws(() => validPlan(next, version));
    assert(validPlan({ ...next, manualGatesPassed: true, evidence: ['docs/compatibility.md: completed manual matrix'] }, version));
  }
});

test('publication requires exactly four complete assets with digests', () => {
  const names = ['presentation-studio.html', 'presentation-studio-blank.html', 'presentation-studio-v0.2.0.zip', 'studio-demo-editable.zip'];
  const assets = names.map(name => ({ name, state: 'uploaded', size: 100, digest: 'sha256:' + 'a'.repeat(64) }));
  assert(validAssets(assets, '0.2.0'));
  assert(!validAssets(assets.slice(1), '0.2.0'));
  assert(!validAssets([{ ...assets[0], size: 0 }, ...assets.slice(1)], '0.2.0'));
  assert(!validAssets([{ ...assets[0], digest: null }, ...assets.slice(1)], '0.2.0'));
});
