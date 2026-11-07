import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredChecks, validated, validPlan, validAssets, eligiblePR, protectedDelivery, createGitHubAPI, deliver } from '../scripts/delivery.mjs';

function lifecycle() {
  const state = {
    main: 'validated', tagged: null, release: null, runs: [], writes: [], requests: [], blockers: [], ancestry: 'ahead',
    plan: { publish: true, version: '0.1.4-alpha', notes: 'docs/releases/0.1.4-alpha.md' },
    checks: requiredChecks.map(name => ({ name, status: 'completed', conclusion: 'success' })),
    taggedPlan: null, lookupError: false, prefixReleases: [],
  };
  function api(path, method = 'GET', body) {
    state.requests.push(path);
    if (method !== 'GET') {
      state.writes.push({ path, method, body });
      if (path === 'git/refs') state.tagged = body.sha;
      else if (path === 'releases/42') Object.assign(state.release, body);
      else throw new Error('Unexpected mutation: ' + path);
      return {};
    }
    if (path === '') return { allow_auto_merge: true };
    if (path === 'branches/main/protection') return {
      enforce_admins: { enabled: true }, required_status_checks: { strict: true, checks: requiredChecks.map(context => ({ context, app_id: 15368 })) },
      required_pull_request_reviews: {}, required_conversation_resolution: { enabled: true },
    };
    if (path === 'commits/main') return { sha: state.main };
    if (path.startsWith('contents/')) {
      const [file, query] = path.slice('contents/'.length).split('?');
      const ref = new URLSearchParams(query).get('ref');
      const value = file === 'package.json' ? JSON.stringify({ version: state.plan.version }) : file === 'release-plan.json' ? JSON.stringify(ref === state.tagged && state.taggedPlan ? state.taggedPlan : state.plan) : `Approved notes at ${ref}`;
      return { content: Buffer.from(value).toString('base64') };
    }
    if (path.startsWith('releases?')) {
      if (state.lookupError) throw new Error('Release listing unauthorized');
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
      return [...state.prefixReleases, ...(state.release ? [state.release] : [])].slice((page - 1) * 100, page * 100);
    }
    if (path === 'releases/42') return structuredClone(state.release);
    if (path.startsWith('git/ref/tags/')) {
      if (state.tagged) return { object: { type: 'commit', sha: state.tagged } };
      throw Object.assign(new Error('Absent tag'), { stderr: '(HTTP 404)' });
    }
    if (path.startsWith('compare/')) return { status: state.ancestry };
    if (path.includes('/check-runs?')) return { check_runs: state.checks };
    if (path.endsWith('/status')) return { total_count: 0 };
    if (path.startsWith('issues?')) return state.blockers;
    if (path.startsWith('actions/workflows/')) return { workflow_runs: state.runs };
    throw new Error('Unexpected endpoint: ' + path);
  }
  function draft() {
    state.release = { id: 42, tag_name: 'v0.1.4-alpha', draft: true, assets: ['presentation-studio.html', 'presentation-studio-blank.html', 'presentation-studio-v0.1.4-alpha.zip', 'studio-demo-editable.zip'].map(name => ({ name, size: 10, state: 'uploaded', digest: 'sha256:' + 'a'.repeat(64) })) };
    state.runs = [{ id: 1, head_sha: state.tagged, head_branch: 'v0.1.4-alpha', event: 'push', status: 'completed', conclusion: 'success' }];
  }
  return { state, draft, run: apply => deliver(apply, { api, run: () => '[]' }) };
}

test('delivery lifecycle tags, waits, discovers paginated draft, publishes and is idempotent after main advances', () => {
  const fixture = lifecycle();
  const { state } = fixture;
  assert.match(fixture.run(true)[0], /Tag v0.1.4-alpha/);
  assert.equal(state.tagged, 'validated');
  assert.deepEqual(fixture.run(true), []);
  fixture.draft();
  state.runs[0].status = 'in_progress';
  assert.deepEqual(fixture.run(true), []);
  state.runs[0].status = 'completed';
  state.main = 'new-main';
  state.prefixReleases = Array.from({ length: 100 }, (_, index) => ({ id: index + 100, tag_name: 'other-' + index }));
  assert.match(fixture.run(false)[0], /Publish.*validated/);
  assert.equal(state.release.draft, true);
  assert.match(fixture.run(true)[0], /Publish.*validated/);
  assert.equal(state.release.draft, false);
  assert.equal(state.release.body, 'Approved notes at validated');
  assert.equal(state.release.prerelease, true);
  assert(state.requests.includes('releases?per_page=100&page=2'));
  assert(!state.requests.some(path => path.startsWith('releases/tags/')));
  assert.deepEqual(fixture.run(true), []);
  assert.equal(state.writes.length, 2);
});

test('delivery distinguishes missing drafts, lookup failures and incomplete assets', () => {
  const fixture = lifecycle();
  fixture.run(true);
  fixture.draft();
  const draft = fixture.state.release;
  fixture.state.release = null;
  assert.throws(() => fixture.run(true), /no matching draft/);
  fixture.state.lookupError = true;
  assert.throws(() => fixture.run(true), /listing unauthorized/);
  fixture.state.lookupError = false;
  fixture.state.release = draft;
  draft.assets.pop();
  assert.throws(() => fixture.run(true), /Draft release 42 artifacts/);
  assert.equal(fixture.state.writes.length, 1);
});

test('existing tags cannot bypass plan, ancestry, validation, workflow or blocker gates', () => {
  for (const failure of ['plan', 'ancestry', 'checks', 'workflow', 'blocker', 'cancel']) {
    const fixture = lifecycle();
    fixture.run(true);
    fixture.draft();
    const { state } = fixture;
    state.main = 'new-main';
    if (failure === 'plan') state.taggedPlan = { ...state.plan, evidence: ['changed'] };
    if (failure === 'ancestry') state.ancestry = 'diverged';
    if (failure === 'checks') state.checks[0].conclusion = 'failure';
    if (failure === 'workflow') state.runs[0].conclusion = 'failure';
    if (failure === 'blocker') state.blockers = [{ number: 123 }];
    if (failure === 'cancel') state.plan.publish = false;
    if (['blocker', 'cancel'].includes(failure)) assert.deepEqual(fixture.run(true), []);
    else assert.throws(() => fixture.run(true));
    assert.equal(state.release.draft, true);
    assert.equal(state.writes.length, 1);
  }
});

test('missing or pending required checks cannot create a release tag', () => {
  for (const checks of [[], [{ name: requiredChecks[0], status: 'in_progress', conclusion: null }]]) {
    const fixture = lifecycle();
    fixture.state.checks = checks;
    assert.deepEqual(fixture.run(true), []);
    assert.equal(fixture.state.writes.length, 0);
  }
});

test('GitHub API requests omit the repository-root slash and preserve nested requests', () => {
  const requests = [];
  const api = createGitHubAPI((args, body) => {
    requests.push({ args, body });
    return '{"ok":true}';
  });
  assert.deepEqual(api(''), { ok: true });
  api('branches/main/protection');
  api('commits/main/check-runs?per_page=100');
  const body = { ref: 'refs/tags/v0.1.4-alpha', sha: 'validated-sha' };
  api('git/refs', 'POST', body);
  assert.deepEqual(requests, [
    { args: ['api', 'repos/treisland/presentation-studio', '--method', 'GET'], body: undefined },
    { args: ['api', 'repos/treisland/presentation-studio/branches/main/protection', '--method', 'GET'], body: undefined },
    { args: ['api', 'repos/treisland/presentation-studio/commits/main/check-runs?per_page=100', '--method', 'GET'], body: undefined },
    { args: ['api', 'repos/treisland/presentation-studio/git/refs', '--method', 'POST', '--input', '-'], body },
  ]);
});

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
