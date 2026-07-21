---
name: staging
description: >-
  Promote dev across the Endchess monorepo: commit and push pending work on dev,
  run all tests in every repo, merge dev into main for library and service repos,
  merge dev into staging for endchess-frontend, endchess-backend, and endchess-workers,
  then push and open staging → main PRs when needed. Use when the user invokes
  /staging or asks to promote dev to staging/main across repos.
disable-model-invocation: true
---

# /staging — promote dev across repos

Invoking **`/staging`** is explicit approval to commit pending work on **`dev`**, push **`origin dev`**, run the merges and pushes in this skill, and **open staging → main PRs** for frontend, backend, and workers when needed. It does **not** approve merging those PRs (production merge stays manual).

## Autonomous execution

When the user invokes **`/staging`** (or asks to run this skill) in their message:

- **Do not** pause to ask for separate approval to commit, merge, push, or open staging → main PRs — that invocation is the approval.
- **Execute** the full skill end-to-end: **commit all safe pending work on `dev` in every repo first**, **run all tests in every repo**, then main-group merges and pushes, wait for CI, staging-app merges and pushes, then **open staging → main PRs** where needed.
- **Only stop** for: secrets in the working tree, merge conflicts, test failures, CI failures, or a dirty tree that cannot be committed safely.

## Repo groups

| Group | Repos | Merge | Push |
| --- | --- | --- | --- |
| **Staging apps** | `endchess-frontend`, `endchess-backend`, `endchess-workers` | `dev` → `staging` | `origin staging` |
| **Everything else** | See [repos.md](repos.md) | `dev` → `main` | `origin main` |

Run **commit to dev first** in **every** repo (complete the full scan before any merge), **run tests in every repo** (same order), then **main-group repos** (models and libraries before app repos), **wait for their CI**, then **staging apps last**.

## Commit to dev first (every repo) — mandatory gate

**Do not merge or push anything to `staging` or `main` until this step has run in every repo in [repos.md](repos.md).**

Before any merges, scan every repo in [repos.md](repos.md):

1. `git fetch origin`
2. **Branch** — checkout `dev` (`git checkout dev`, or `git checkout -b dev origin/dev` if missing). Never commit on `staging` or `main`.
3. **Uncommitted changes** — if the working tree is dirty:
   - Review `git status`, `git diff`, and untracked files.
   - Do **not** stage secrets (`.env`, `.env.*`, credentials, `cookies.txt`, etc.); warn the user if a repo is blocked on secrets only.
   - **Commit everything else** — all modified and untracked safe files. Prefer `git add -A`, then `git reset` secret paths if any are present.
   - **Never cherry-pick** only “product” or code files. Agent skills (`.agents/`), cursor rules, docs, scripts, and config belong in the same commit when they are part of the pending tree.
   - **Never skip** a repo because its changes look unrelated to another repo’s feature.
   - Commit with a concise message (1–2 sentences, focus on why).
   - `git push origin dev`
4. **Unpushed commits** — if local `dev` is ahead of `origin/dev`, `git push origin dev`.
5. If clean, on `dev`, and in sync with `origin/dev`, skip.

After this gate, each repo should be clean except secrets-only leftovers (report those; do not merge that repo until resolved or explicitly excluded by the user).

## Run tests (every repo) — mandatory gate

**Do not merge or push anything to `staging` or `main` until tests pass in every repo in [repos.md](repos.md).**

After **Commit to dev first** and before **Pre-flight**, run tests locally in every repo in dependency order (main-group order in [repos.md](repos.md), then staging apps). This gate runs on **every** `/staging` invocation — never skip it.

For each repo:

```bash
cd <repo-path>
git checkout dev
npm run prepare:deps   # when package.json defines it; skip otherwise
```

Run **every** `test*` script in `package.json` (alphabetical script-name order), except teardown helpers like `test:e2e:teardown`:

```bash
npm test
npm run test:integration    # when present
npm run test:e2e            # when present; use --runInBand if CI does
```

Repo-specific overrides (match CI):

| Repo | Commands |
| --- | --- |
| endchess-backend | `npm test -- --runInBand` |
| endchess-frontend | `npm test` then `npm run test:integration` |
| endchess-workers | `npm test` then `npm run test:e2e -- --runInBand` |
| endchess-batch-import | `npm test` then `npm run test:e2e -- --runInBand` |

Repos with **no** `test*` scripts — run publish-CI checks instead:

```bash
npm run build
npm run typecheck   # when present (e.g. endchess-course-builder, endchess-batch-import)
```

- **Failures** — if any command fails, **stop** the entire `/staging` run; fix tests before merging.
- **e2e** — run when defined. If required env is missing (e.g. `MONGO_URI`), stop and report what is needed; do not merge until e2e passes or the user explicitly skips e2e for this run.
- **node_modules** — if tests fail with missing modules, run `npm install` once in that repo and retry before treating as a real failure.

## Pre-flight (every repo)

1. `git fetch origin`
2. Skip if `dev` has no commits ahead of the target: `git log origin/<target>..origin/dev --oneline` is empty.
3. If the working tree is still dirty after **Commit to dev first** (e.g. secrets-only or uncommittable files), stop that repo and report — do not ask for merge/push approval; only block on fixable hygiene issues.
4. Do not merge if `dev` is behind the target without also being ahead; fetch and report if a fast-forward of `dev` is needed first.

## Merge procedure

For each repo that needs promotion:

```bash
cd <repo-path>
git fetch origin
git checkout <target>          # staging or main
git pull origin <target>
git merge origin/dev --no-edit   # use custom message for staging apps (below)
git push origin <target>
git checkout dev
git pull origin dev
```

### Staging apps — merge commit message

When `dev` has non-trivial changes, do **not** use the default merge message alone:

```text
Merge dev into staging: <one-line summary of user-facing or deploy-relevant changes>
```

For pin-only or empty promotions, `Merge dev into staging` is fine.

Summarize from `git log origin/staging..origin/dev --oneline` before merging.

### Main-group repos — merge commit message

Use the default merge message, or:

```text
Merge dev into main: <short summary>
```

## Wait for main-group CI before staging apps

After every **main-group** repo is merged and pushed to `origin main`, **stop** before touching frontend, backend, or workers. Do **not** merge `dev` → `staging` on staging apps until CI is **green** on every main-group repo you pushed in this run.

Library and settings repos run **Publish** on push to `main` (build, npm publish, version bump commit). Staging Workflow on frontend, backend, and workers runs `sync-npm-pins-ci.mjs` against the registry — promoting staging apps before publish finishes leaves pins stale or breaks the build.

For each main-group repo that was **merged and pushed** (not skipped):

```bash
cd <repo-path>
gh run list --branch main --limit 1 --json databaseId,status,conclusion,workflowName
gh run watch <run-id> --exit-status
```

- Repos with no workflow (consumers, batch jobs, etc.) — no wait; note in the report.
- If a repo was skipped because `dev` had nothing to promote — do not wait on it.
- If any watched run fails, **stop**; do not merge staging apps until the user fixes or retries.
- When all applicable runs succeed, continue to **Promote staging apps** below.

## Promote staging apps (dev → staging)

After main-group CI is green, merge **every** staging app in [repos.md](repos.md) — including **`endchess-workers`**. Workers is a deploy app like frontend and backend; do **not** merge `dev` → `main` there.

Run in order:

1. `endchess-frontend` → `staging`
2. `endchess-backend` → `staging`
3. `endchess-workers` → `staging`

For each repo, use the merge procedure above with `<target>` = `staging` and the staging-apps merge commit message.

Pre-flight per repo: `git log origin/staging..origin/dev --oneline` — skip only if empty.

### Sync npm pins on staging before pushing

CI-time pin mutation is fragile (stale `overrides` caused EOVERRIDE failures; registry races leave pins stale). Commit the pin sync yourself so Staging Workflow's in-place sync is a no-op:

After merging `dev` into `staging` and **before** `git push origin staging`, while still on `staging`:

```bash
node --input-type=module -e "import { syncNpmDepPins } from './scripts/sync-npm-dep-pins.mjs'; syncNpmDepPins(process.cwd());"
npm install --package-lock-only --no-audit --no-fund
git diff --quiet package.json package-lock.json || git commit -am "Sync npm pins to latest published libs"
```

- Use `--package-lock-only` — local `node_modules` often contains symlinked workspace libs that a full `npm install` cannot replace (EISDIR).
- Skip in repos without `scripts/sync-npm-dep-pins.mjs`.
- Never put skip-ci keywords in the commit message.

### Watch staging CI after each push

Staging Workflow deploys and (on frontend) runs Playwright e2e against the live staging site. A green push is not done until the workflow is green:

```bash
gh run list --branch staging --limit 1 --json databaseId,status,conclusion
gh run watch <run-id> --exit-status
```

If a run fails, diagnose before touching the next repo; include the failure in the report.

## Open staging → main PRs (staging apps) — always when needed

After staging-app promotion (and staging CI watches), **always** ensure an open **staging → main** PR exists for each staging app where `origin/staging` is ahead of `origin/main`. Do this even if this run skipped merging a repo (staging may already be ahead from a prior run).

For each of `endchess-frontend`, `endchess-backend`, `endchess-workers`:

```bash
cd <repo-path>
git fetch origin
# Skip if nothing to promote to production
git log origin/main..origin/staging --oneline
# If empty → skip (already in sync)

# Reuse an existing open PR if present
gh pr list --base main --head staging --state open --json url,number

# If none open, create one
gh pr create --base main --head staging --title "<title>" --body "$(cat <<'EOF'
## Summary
- Promote staging to production: <one-line summary from git log origin/main..origin/staging --oneline>

## Test plan
- [ ] Staging CI green on this commit range
- [ ] Spot-check critical paths on production after merge
EOF
)"
```

- **Title** — prefer something like `Promote staging → main: <short summary>`; for pin-only bumps, `Promote staging → main` is fine.
- **Never merge** the PR — leave it open for the user to merge after reviewing.
- If `gh pr create` fails because a PR already exists, report that PR’s URL and continue.
- Include every opened or existing PR URL in the final report.

## Rules (do not violate)

- **Never** merge `dev` → `main` on `endchess-frontend`, `endchess-backend`, or `endchess-workers` — those three are staging apps only (`dev` → `staging`).
- **Never** merge `staging` → `main` on frontend, backend, or workers — **open** the PR; the user merges production.
- **Never** put global skip-ci keywords in merge commit messages or PR bodies (see workspace git rules).
- **Never** push to `main` on frontend, backend, or workers — only push `staging` there.
- Pushing `main` on other repos **is** part of `/staging` (models publish on push to `main`).
- If a merge conflicts, stop that repo, report the conflict, and continue other repos only after the user resolves it.
- Do not use `--no-verify` unless the user explicitly asks.

## Report

When finished, return a table:

| Repo | Tests | Target | Result | Notes |
| --- | --- | --- | --- | --- |
| … | pass / fail / n/a | staging/main | merged+pushed / skipped / failed | commit range or error |

For staging apps, add a **Production PRs** section with the staging → main PR URL (created or already open) for each repo that was ahead, or `n/a` if staging was already in sync with main. Remind the user that **merging** those PRs is still the manual production step.

## Repo paths

All repos live under `/Users/robert/code/endchess/`. Full list: [repos.md](repos.md).
