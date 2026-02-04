#!/bin/bash

# =========================================================
# RLS Policy Linting Script
# Date: 2026-02-04
# Purpose: Detect vulnerable RLS patterns in SQL migrations
# =========================================================
#
# USAGE:
#   ./scripts/lint-rls-policies.sh [--fix] [--ci]
#
# OPTIONS:
#   --fix  Show suggestions for fixing vulnerabilities
#   --ci   Exit with non-zero status if vulnerabilities found
#
# =========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../supabase/migrations"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
TOTAL_FILES=0

# Arguments
FIX_MODE=false
CI_MODE=false

for arg in "$@"; do
  case $arg in
    --fix)
      FIX_MODE=true
      ;;
    --ci)
      CI_MODE=true
      ;;
  esac
done

echo ""
echo "==========================================================="
echo "  RLS SECURITY POLICY LINTER"
echo "  Scanning: ${MIGRATIONS_DIR}"
echo "==========================================================="
echo ""

# Function to check for vulnerable patterns
check_file() {
  local file="$1"
  local filename=$(basename "$file")
  local vulnerabilities=""
  local file_has_issues=false

  # Skip hotfix files (they contain the fixes, not the bugs)
  if [[ "$filename" == *"hotfix"* ]] || [[ "$filename" == *"security_fix"* ]]; then
    return
  fi

  # Skip test files
  if [[ "$filename" == *"test"* ]]; then
    return
  fi

  ((TOTAL_FILES++))

  # Check for profile_id = auth.uid() bug (CRITICAL)
  if grep -qE "profile_id\s*=\s*auth\.uid\(\)" "$file" 2>/dev/null; then
    # Exclude lines that are part of the correct pattern (with JOIN profiles)
    vulnerable_lines=$(grep -n "profile_id\s*=\s*auth\.uid()" "$file" | grep -v "p\.user_id = auth\.uid()" || true)
    if [ -n "$vulnerable_lines" ]; then
      file_has_issues=true
      ((CRITICAL_COUNT++))
      echo -e "${RED}[CRITICAL]${NC} $filename"
      echo "  Bug: profile_id = auth.uid() (profile_id and auth.uid() are different UUIDs!)"
      echo "  Lines: $vulnerable_lines"
      if $FIX_MODE; then
        echo -e "  ${BLUE}Fix: Use public.is_member_of_business(business_id) or JOIN profiles p ON p.id = bm.profile_id WHERE p.user_id = auth.uid()${NC}"
      fi
      echo ""
    fi
  fi

  # Check for owner_profile_id = auth.uid() bug (CRITICAL)
  if grep -qE "owner_profile_id\s*=\s*auth\.uid\(\)" "$file" 2>/dev/null; then
    vulnerable_lines=$(grep -n "owner_profile_id\s*=\s*auth\.uid()" "$file" || true)
    if [ -n "$vulnerable_lines" ]; then
      file_has_issues=true
      ((CRITICAL_COUNT++))
      echo -e "${RED}[CRITICAL]${NC} $filename"
      echo "  Bug: owner_profile_id = auth.uid()"
      echo "  Lines: $vulnerable_lines"
      if $FIX_MODE; then
        echo -e "  ${BLUE}Fix: Use public.is_business_owner(business_id)${NC}"
      fi
      echo ""
    fi
  fi

  # Check for patient_id = auth.uid() bug (CRITICAL for PHI tables)
  if grep -qE "patient_id\s*=\s*auth\.uid\(\)" "$file" 2>/dev/null; then
    vulnerable_lines=$(grep -n "patient_id\s*=\s*auth\.uid()" "$file" || true)
    if [ -n "$vulnerable_lines" ]; then
      file_has_issues=true
      ((HIGH_COUNT++))
      echo -e "${YELLOW}[HIGH]${NC} $filename"
      echo "  Bug: patient_id = auth.uid() (patient_id references profiles.id, not user_id)"
      echo "  Lines: $vulnerable_lines"
      if $FIX_MODE; then
        echo -e "  ${BLUE}Fix: Use patient_id = public.get_my_profile_id()${NC}"
      fi
      echo ""
    fi
  fi

  # Check for USING(true) policies (HIGH - unless intentionally public)
  if grep -qE "USING\s*\(\s*true\s*\)" "$file" 2>/dev/null; then
    vulnerable_lines=$(grep -n "USING\s*(\s*true\s*)" "$file" || true)
    if [ -n "$vulnerable_lines" ]; then
      file_has_issues=true
      ((HIGH_COUNT++))
      echo -e "${YELLOW}[HIGH]${NC} $filename"
      echo "  Concern: USING(true) bypasses all access controls"
      echo "  Lines: $vulnerable_lines"
      if $FIX_MODE; then
        echo -e "  ${BLUE}Fix: Add proper business_id or user checks, or document if intentionally public${NC}"
      fi
      echo ""
    fi
  fi

  # Check for WITH CHECK(true) policies (MEDIUM)
  if grep -qE "WITH\s+CHECK\s*\(\s*true\s*\)" "$file" 2>/dev/null; then
    vulnerable_lines=$(grep -n "WITH\s+CHECK\s*(\s*true\s*)" "$file" || true)
    if [ -n "$vulnerable_lines" ]; then
      file_has_issues=true
      ((MEDIUM_COUNT++))
      echo -e "${YELLOW}[MEDIUM]${NC} $filename"
      echo "  Concern: WITH CHECK(true) allows unrestricted inserts"
      echo "  Lines: $vulnerable_lines"
      if $FIX_MODE; then
        echo -e "  ${BLUE}Fix: Add proper authorization checks for INSERT operations${NC}"
      fi
      echo ""
    fi
  fi

  # Check for employees table reference (may not exist)
  if grep -qE "FROM\s+employees\s+WHERE" "$file" 2>/dev/null; then
    vulnerable_lines=$(grep -n "FROM\s+employees\s+WHERE" "$file" || true)
    if [ -n "$vulnerable_lines" ]; then
      file_has_issues=true
      ((MEDIUM_COUNT++))
      echo -e "${YELLOW}[MEDIUM]${NC} $filename"
      echo "  Concern: 'employees' table may not exist (should be 'business_members')"
      echo "  Lines: $vulnerable_lines"
      if $FIX_MODE; then
        echo -e "  ${BLUE}Fix: Replace 'employees' with 'business_members'${NC}"
      fi
      echo ""
    fi
  fi
}

# Scan all SQL files
for file in "$MIGRATIONS_DIR"/*.sql; do
  if [ -f "$file" ]; then
    check_file "$file"
  fi
done

# Summary
echo "==========================================================="
echo "  SCAN SUMMARY"
echo "==========================================================="
echo ""
echo "Files scanned: $TOTAL_FILES"
echo ""
echo -e "${RED}Critical issues:${NC} $CRITICAL_COUNT"
echo -e "${YELLOW}High issues:${NC}     $HIGH_COUNT"
echo -e "${YELLOW}Medium issues:${NC}   $MEDIUM_COUNT"
echo ""

TOTAL_ISSUES=$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT))

if [ $TOTAL_ISSUES -eq 0 ]; then
  echo -e "${GREEN}No known RLS vulnerabilities detected!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}Total issues found: $TOTAL_ISSUES${NC}"
  echo ""
  echo "RECOMMENDED ACTIONS:"
  echo "  1. Review each issue above"
  echo "  2. For CRITICAL issues: Fix immediately with new migration"
  echo "  3. For HIGH issues: Assess if intentionally public, otherwise fix"
  echo "  4. For MEDIUM issues: Verify correct behavior"
  echo ""
  echo "Run with --fix flag for suggested fixes"
  echo ""

  if $CI_MODE; then
    echo -e "${RED}CI MODE: Failing build due to security issues${NC}"
    exit 1
  fi
fi
