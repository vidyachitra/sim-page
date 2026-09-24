#!/usr/bin/env bash
# Runs check_sim.js on every sim in assets/sims/, with its page when one exists.
# Exit 1 if any sim fails. Usage: bash scripts/check_all.sh
set -u
cd "$(dirname "$0")/.."

status=0
failed=()
for sim in assets/sims/*.js; do
  id=$(basename "$sim" .js)
  page=$(find . -name "$id.md" -not -path './.claude/*' -not -path './_site/*' -not -path './vendor/*' | head -n 1)
  if [ -z "$page" ]; then
    echo "  ! no page found for $id; checking the sim only"
    node scripts/check_sim.js assets/js/sim-core.js "$sim" || { status=1; failed+=("$id"); }
  else
    node scripts/check_sim.js assets/js/sim-core.js "$sim" "$page" || { status=1; failed+=("$id"); }
  fi
  echo
done

if [ $status -ne 0 ]; then
  echo "FAILED: ${failed[*]}"
else
  echo "All sims passed."
fi
exit $status
