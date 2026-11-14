import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function allowedRoute(pr) {
  return pr.baseRefName === 'dev' || (pr.baseRefName === 'main' && pr.headRefName === 'dev' && pr.isCrossRepository === false);
}
export function validateEvent(eventName, event) {
  if (eventName !== 'pull_request') return;
  const pr = event.pull_request;
  if (!pr || !allowedRoute({ baseRefName: pr.base.ref, headRefName: pr.head.ref,
    isCrossRepository: !pr.head.repo?.full_name || pr.head.repo.full_name !== pr.base.repo?.full_name }))
    throw new Error('Feature PRs target dev; only same-repository dev promotion PRs target main.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateEvent(process.env.GITHUB_EVENT_NAME, JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')));
}
