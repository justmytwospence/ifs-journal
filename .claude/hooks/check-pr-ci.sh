#!/usr/bin/env bash
# Stop-hook helper: if the current branch has an open PR AND HEAD is pushed,
# block stopping until CI is green. Triggers a re-wake while checks are still
# running so the agent reports back when CI finishes.
#
# Exits:
#   0 — CI green (or nothing to check: detached HEAD, main branch, no open PR,
#       local commits not yet pushed, gh unavailable, etc.)
#   2 — CI failing or still running. Prints the gh checks output for context.

set -u

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
case "$branch" in
  main|master|HEAD) exit 0 ;;
esac

# Only check if local HEAD is fully pushed. If we're ahead of origin there's
# nothing for CI to run against yet.
local_sha=$(git rev-parse HEAD 2>/dev/null) || exit 0
remote_sha=$(git rev-parse "origin/$branch" 2>/dev/null) || exit 0
[ "$local_sha" = "$remote_sha" ] || exit 0

command -v gh >/dev/null 2>&1 || exit 0

pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number' 2>/dev/null) || exit 0
[ -n "$pr" ] || exit 0

# gh pr checks exits non-zero if anything is failing or still pending.
if output=$(gh pr checks "$pr" 2>&1); then
  exit 0
fi

echo "CI not green for PR #$pr (branch $branch):"
echo "$output"
exit 2
