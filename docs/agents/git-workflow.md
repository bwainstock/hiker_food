# Git publishing

All changes land on `main` through a pull request from a feature branch.

## Workflow

1. Before the first commit, create a feature branch when the current branch is
   `main`:

   ```bash
   git switch -c <type>/<issue>-<slug>
   ```

2. Commit the work, push the feature branch, and create the pull request:

   ```bash
   git push --set-upstream origin HEAD
   gh pr create
   ```

3. Wait for every pull-request check to finish:

   ```bash
   gh pr checks <number> --watch
   ```

4. After the checks pass, merge and delete the remote feature branch:

   ```bash
   gh pr merge <number> --merge --delete-branch
   ```

5. Synchronize local `main`:

   ```bash
   git switch main
   git pull --ff-only
   ```

Publishing is complete when the pull request reports `MERGED` and local `main`
matches `origin/main`.

## Branch policy

GitHub protects `main` with strict `Smoke / Chromium` and
`Full regression / Chromium` status checks, including for administrators.
Repository auto-merge is disabled, so issue the merge command after checks pass.

GitHub is the live source of truth. Inspect the current protection and merge
settings before diagnosing a rejected operation:

```bash
gh api 'repos/{owner}/{repo}/branches/main/protection'
gh api 'repos/{owner}/{repo}' \
  --jq '{allow_auto_merge,allow_merge_commit,allow_squash_merge,allow_rebase_merge}'
```
