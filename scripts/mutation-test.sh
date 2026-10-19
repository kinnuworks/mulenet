#!/usr/bin/env bash
# Mutation testing for mulenet.compact.
# Each mutant removes or weakens one security guard. The test suite must fail
# ("kill") every mutant; a surviving mutant means an untested guard.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/contract/src/mulenet.compact"
MANAGED="$ROOT/contract/src/managed/mulenet"
WORK="$(mktemp -d)"
cp "$SRC" "$WORK/original.compact"
cp -R "$MANAGED" "$WORK/managed.bak"

restore() {
  cp "$WORK/original.compact" "$SRC"
  rm -rf "$MANAGED" && cp -R "$WORK/managed.bak" "$MANAGED"
}
trap restore EXIT

# name | perl substitution applied to the contract source
MUTANTS=(
  "no-double-report-check|s/assert\(!nullifiers\.member\(nul\), [^;]*;//"
  "no-membership-root-check|s/assert\(banks\.checkRoot\(/assert(true || banks.checkRoot(/"
  "no-leaf-binding|s/assert\(path\.leaf == leaf, [^;]*;//"
  "no-consortium-key-check|s/assert\(consortiumKeyCommit\(ck\) == consortiumKeyCommitment, [^;]*;//"
  "no-regulator-check|s/assert\(regulator == regulatorKey\(regulatorSecret\(\)\), [^;]*;//"
  "threshold-off-by-one|s/if \(count >= threshold\)/if (count > threshold)/"
  "no-unflag-on-retract|s/if \(count < threshold && flagged\.member\(tag\)\)/if (false)/"
  "no-retract-ownership|s/assert\(nullifiers\.member\(nul\), [^;]*;//"
  "no-round-in-nullifier|s/reportNullifier\(sk, tag, currentRound\(tag\)\)/reportNullifier(sk, tag, 0)/g"
  "no-history-reset-on-revoke|s/banks\.resetHistory\(\);//"
  "delist-keeps-flag|s/flagged\.remove\(t\);//"
  "no-threshold-guard|s/assert\(k > 0, [^;]*;//"
)

killed=0; survived=0
for m in "${MUTANTS[@]}"; do
  name="${m%%|*}"; expr="${m#*|}"
  cp "$WORK/original.compact" "$SRC"
  perl -0pi -e "$expr" "$SRC"
  if cmp -s "$SRC" "$WORK/original.compact"; then
    echo "!! $name: substitution did not apply (fix the pattern)"; survived=$((survived+1)); continue
  fi
  if ! (cd "$ROOT/contract" && compact compile src/mulenet.compact src/managed/mulenet >/dev/null 2>&1); then
    echo "killed   $name (does not compile)"; killed=$((killed+1)); continue
  fi
  if (cd "$ROOT/contract" && npx vitest run >/dev/null 2>&1); then
    echo "SURVIVED $name"; survived=$((survived+1))
  else
    echo "killed   $name"; killed=$((killed+1))
  fi
done

echo "-----"
echo "mutants killed: $killed / $((killed+survived))"
[ "$survived" -eq 0 ]
