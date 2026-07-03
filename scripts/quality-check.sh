#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# quality-check.sh — Full local quality gate for sellitright
#
# Usage:
#   ./scripts/quality-check.sh              # all checks
#   ./scripts/quality-check.sh --no-e2e     # skip E2E (fast, ~60s)
#   ./scripts/quality-check.sh --only-e2e   # E2E only
#   ./scripts/quality-check.sh --fix        # auto-fix lint + format first
#
# Exit code: 0 = all passed, 1 = one or more failed
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── CLI flags ─────────────────────────────────────────────────────────────────
SKIP_E2E=false
ONLY_E2E=false
AUTO_FIX=false

for arg in "$@"; do
  case "$arg" in
    --no-e2e)   SKIP_E2E=true ;;
    --only-e2e) ONLY_E2E=true ;;
    --fix)      AUTO_FIX=true ;;
  esac
done

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── State (parallel arrays — bash 3 compatible) ───────────────────────────────
CHECK_NAMES=()
CHECK_STATUSES=()
CHECK_DURATIONS=()
CHECK_OUTPUTS=()
OVERALL_PASSED=true

# ── run_check <label> <cmd...> ────────────────────────────────────────────────
run_check() {
  local label="$1"
  shift

  printf "${CYAN}▶  %-20s${RESET}" "$label"

  local start
  start=$(date +%s)
  local tmpfile
  tmpfile=$(mktemp)

  if "$@" >"$tmpfile" 2>&1; then
    local status="PASS"
  else
    local status="FAIL"
    OVERALL_PASSED=false
  fi

  local duration=$(( $(date +%s) - start ))
  local output
  output=$(cat "$tmpfile")
  rm -f "$tmpfile"

  case "$status" in
    PASS) echo -e " ${GREEN}✓ PASS${RESET} (${duration}s)" ;;
    FAIL) echo -e " ${RED}✗ FAIL${RESET} (${duration}s)" ;;
  esac

  CHECK_NAMES+=("$label")
  CHECK_STATUSES+=("$status")
  CHECK_DURATIONS+=("$duration")
  CHECK_OUTPUTS+=("$output")
}

skip_check() {
  local label="$1"
  printf "${CYAN}▶  %-20s${RESET}" "$label"
  echo -e " ${YELLOW}– SKIP${RESET}"
  CHECK_NAMES+=("$label")
  CHECK_STATUSES+=("SKIP")
  CHECK_DURATIONS+=("0")
  CHECK_OUTPUTS+=("")
}

# ── Auto-fix pass ─────────────────────────────────────────────────────────────
if [ "$AUTO_FIX" = "true" ]; then
  echo ""
  echo -e "${BOLD}── Auto-fix (lint + format) ─────────────────────────────${RESET}"
  pnpm --filter web lint:fix || true
  pnpm format || true
  echo ""
fi

# ── Run checks ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  sellitright — Quality Gate                              ${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

OVERALL_START=$(date +%s)

if [ "$ONLY_E2E" = "false" ]; then
  run_check "TypeScript"  pnpm --filter web typecheck
  run_check "Lint"        pnpm --filter web lint
  run_check "Format"      pnpm format:check
  run_check "Unit Tests"  pnpm --filter web test -- --reporter=verbose
  run_check "Build"       pnpm --filter web build
fi

if [ "$SKIP_E2E" = "false" ]; then
  run_check "E2E Tests"   pnpm --filter web test:e2e
else
  skip_check "E2E Tests"
fi

OVERALL_END=$(date +%s)
OVERALL_DURATION=$(( OVERALL_END - OVERALL_START ))

# ── Summary table ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Results Summary                                         ${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""
printf "  %-20s %-8s %s\n" "Check" "Status" "Duration"
printf "  %-20s %-8s %s\n" "────────────────────" "────────" "────────"

i=0
while [ $i -lt ${#CHECK_NAMES[@]} ]; do
  name="${CHECK_NAMES[$i]}"
  status="${CHECK_STATUSES[$i]}"
  duration="${CHECK_DURATIONS[$i]}s"

  case "$status" in
    PASS) printf "  ${GREEN}✓${RESET} %-19s ${GREEN}%-8s${RESET} %s\n" "$name" "PASS" "$duration" ;;
    FAIL) printf "  ${RED}✗${RESET} %-19s ${RED}%-8s${RESET} %s\n"    "$name" "FAIL" "$duration" ;;
    SKIP) printf "  ${YELLOW}–${RESET} %-19s ${YELLOW}%-8s${RESET} %s\n" "$name" "SKIP" "$duration" ;;
  esac

  i=$(( i + 1 ))
done

echo ""
printf "  Total time: %ds\n" "$OVERALL_DURATION"
echo ""

# ── Failure details ───────────────────────────────────────────────────────────
if [ "$OVERALL_PASSED" = "false" ]; then
  echo -e "${BOLD}──────────────────────────────────────────────────────────${RESET}"
  echo -e "${BOLD}  Failure Details                                         ${RESET}"
  echo -e "${BOLD}──────────────────────────────────────────────────────────${RESET}"

  i=0
  while [ $i -lt ${#CHECK_NAMES[@]} ]; do
    if [ "${CHECK_STATUSES[$i]}" = "FAIL" ]; then
      echo ""
      echo -e "${RED}▼  ${CHECK_NAMES[$i]}${RESET}"
      echo "${CHECK_OUTPUTS[$i]}" | tail -50
    fi
    i=$(( i + 1 ))
  done

  echo ""
  echo -e "${RED}${BOLD}✗  Quality gate FAILED — do not commit or push.${RESET}"
  echo ""
  echo "  Tips:"
  echo "  • Run with --fix to auto-fix lint + format issues"
  echo "  • Run with --no-e2e for a faster check during development"
  echo "  • Open E2E report: apps/web/playwright-report/index.html"
  echo ""
  exit 1
fi

echo -e "${GREEN}${BOLD}✓  All checks passed. Safe to commit and push.${RESET}"
echo ""
