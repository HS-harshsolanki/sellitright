#!/usr/bin/env bash
# =============================================================================
# smoke-test-staging.sh
# Smoke test for the ChapterNew staging environment.
#
# Tests all critical HTTP endpoints to confirm the deployment is healthy.
# Exits with code 1 if any check fails (suitable for CI/CD gates).
#
# Usage:
#   STAGING_URL=https://staging.chapternew.com ./scripts/smoke-test-staging.sh
#
# Options (via env vars):
#   STAGING_URL   Base URL to test (default: https://staging.chapternew.com)
#   VERBOSE=1     Print full curl output on failure
#   TIMEOUT=10    Max seconds per request (default: 10)
# =============================================================================

set -euo pipefail

BASE_URL="${STAGING_URL:-https://staging.chapternew.com}"
TIMEOUT="${TIMEOUT:-10}"
PASS=0
FAIL=0

# Colours (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  NC='\033[0m' # No Color
else
  GREEN='' RED='' YELLOW='' NC=''
fi

# ── Helpers ──────────────────────────────────────────────────────────────────

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local actual_status
  actual_status=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time "$TIMEOUT" \
    --location \
    "$url" 2>/dev/null || echo "000")

  if [ "$actual_status" = "$expected_status" ]; then
    echo -e "${GREEN}PASS${NC}  $name  ($actual_status)"
    ((PASS++)) || true
  else
    echo -e "${RED}FAIL${NC}  $name — expected $expected_status, got $actual_status"
    echo "       URL: $url"
    if [ "${VERBOSE:-0}" = "1" ]; then
      echo "       ---"
      curl -s --max-time "$TIMEOUT" --location "$url" | head -20
      echo "       ---"
    fi
    ((FAIL++)) || true
  fi
}

check_body() {
  local name="$1"
  local url="$2"
  local expected_string="$3"
  local body
  body=$(curl -s --max-time "$TIMEOUT" --location "$url" 2>/dev/null || echo "")
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" --location "$url" 2>/dev/null || echo "000")

  if echo "$body" | grep -q "$expected_string"; then
    echo -e "${GREEN}PASS${NC}  $name  (body contains '$expected_string')"
    ((PASS++)) || true
  else
    echo -e "${RED}FAIL${NC}  $name — body does not contain '$expected_string' (status: $status)"
    echo "       URL: $url"
    if [ "${VERBOSE:-0}" = "1" ]; then
      echo "       --- body (first 10 lines) ---"
      echo "$body" | head -10
      echo "       ---"
    fi
    ((FAIL++)) || true
  fi
}

section() {
  echo ""
  echo -e "${YELLOW}── $1${NC}"
}

# ── Main ─────────────────────────────────────────────────────────────────────

echo "======================================================================"
echo " ChapterNew Staging Smoke Test"
echo " Target: $BASE_URL"
echo " Timeout: ${TIMEOUT}s per request"
echo "======================================================================"

# ── 1. Infrastructure ─────────────────────────────────────────────────────────
section "Infrastructure"

check "Health endpoint"           "$BASE_URL/api/health"        200
check_body "Health returns ok"    "$BASE_URL/api/health"        '"status"'

# ── 2. Public pages ───────────────────────────────────────────────────────────
section "Public pages"

check "Homepage"                  "$BASE_URL/"                  200
check "Properties / listings"     "$BASE_URL/properties"        200
check "Login page"                "$BASE_URL/login"             200
check "Robots.txt"                "$BASE_URL/robots.txt"        200

# ── 3. Beta gate ──────────────────────────────────────────────────────────────
section "Beta gate"

# Dashboard without session should redirect to /beta or /login (2xx after following redirects)
check "Dashboard redirects auth"  "$BASE_URL/dashboard"         200

# ── 4. Public listing API ─────────────────────────────────────────────────────
section "Public API"

check "Listings API (public)"     "$BASE_URL/api/listings"      200

# ── 5. Auth-guarded API endpoints ─────────────────────────────────────────────
section "Auth guards (must return 401 without credentials)"

check "Admin stats guard"         "$BASE_URL/api/admin/stats"         401
check "Dashboard listings guard"  "$BASE_URL/api/dashboard/listings"  401
check "Notifications guard"       "$BASE_URL/api/notifications"       401
check "Dashboard interests guard" "$BASE_URL/api/dashboard/interests" 401

# ── 6. Staging-specific behaviour ─────────────────────────────────────────────
section "Staging-specific"

# robots.txt should block crawlers on staging
check_body "Robots.txt disallows all" "$BASE_URL/robots.txt" "Disallow: /"

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "======================================================================"
TOTAL=$((PASS + FAIL))
echo " Results: ${PASS}/${TOTAL} passed, ${FAIL} failed"
echo "======================================================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED} STAGING SMOKE TEST FAILED${NC}"
  echo ""
  echo " Tips:"
  echo "   - Check app logs:  fly logs --app chapternew-staging"
  echo "   - Check secrets:   fly secrets list --app chapternew-staging"
  echo "   - Re-run verbose:  VERBOSE=1 STAGING_URL=$BASE_URL $0"
  exit 1
else
  echo -e "${GREEN} STAGING SMOKE TEST PASSED${NC}"
  exit 0
fi
