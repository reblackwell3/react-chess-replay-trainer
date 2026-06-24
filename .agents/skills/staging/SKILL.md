---
name: staging
description: >-
  Promote dev across the Endchess monorepo: commit and push pending work on dev,
  merge dev into main for library and service repos, merge dev into staging for
  endchess-frontend and endchess-backend, then push. Use when the user invokes
  /staging or asks to promote dev to staging/main across repos.
disable-model-invocation: true
---

# /staging — promote dev across repos

Invoking **`/staging`** is explicit approval to commit pending work on **`dev`**, push **`origin dev`**, and run the merges and pushes in this skill. It does **not** approve staging → main (production) for frontend or backend.

## Repo groups

| Group | Repos | Merge | Push |
| --- | --- | --- | --- |
| **Staging apps** | `endchess-frontend`, `endchess-backend` | `dev` → `staging` | `origin staging` |
| **Everything else** | See [repos.md](repos.md) | `dev` → `main` | `origin main` |

Run **commit to dev first** in every repo, then **main-group repos** (models and libraries before app repos), then **staging apps last**.

## Commit to dev first (every repo)

Before any merges, scan every repo in [repos.md](repos.md):

1. `git fetch origin`
2. **Branch** — checkout `dev` (`git checkout dev`, or `git checkout -b dev origin/dev` if missing). Never commit on `staging` or `main`.
3. **Uncommitted changes** — if the working tree is dirty:
   - Review `git status`, `git diff`, and untracked files.
   - Do **not** stage secrets (`.env`, `.env.*`, credentials, `cookies.txt`, etc.); stop that repo and warn if only secrets remain.
   - Stage everything else (`git add` relevant paths, or `git add -A` when safe).
   - Commit with a concise message (1–2 sentences, focus on why).
   - `git push origin dev`
4. **Unpushed commits** — if local `dev` is ahead of `origin/dev`, `git push origin dev`.
5. If clean, on `dev`, and in sync with `origin/dev`, skip.

## Pre-flight (every repo)

1. `git fetch origin`
2. Skip if `dev` has no commits ahead of the target: `git log origin/<target>..origin/dev --oneline` is empty.
3. If the working tree is still dirty after **Commit to dev first**, stop and ask the user to stash or fix before continuing.
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

## Rules (do not violate)

- **Never** merge `staging` → `main` on frontend or backend (production PRs stay manual on GitHub).
- **Never** put global skip-ci keywords in merge commit messages or PR bodies (see workspace git rules).
- **Never** push to `main` on frontend or backend — only push `staging` there.
- Pushing `main` on other repos **is** part of `/staging` (models publish on push to `main`).
- If a merge conflicts, stop that repo, report the conflict, and continue other repos only after the user resolves it.
- Do not use `--no-verify` unless the user explicitly asks.

## Report

When finished, return a table:

| Repo | Target | Result | Notes |
| --- | --- | --- | --- |
| … | staging/main | merged+ pushed / skipped / failed | commit range or error |

Remind the user that production for frontend/backend is a separate manual step: open or merge the **staging → main** PR on GitHub after staging CI is green.

## Repo paths

All repos live under `C:/Users/rebla/code/`. Full list: [repos.md](repos.md).
