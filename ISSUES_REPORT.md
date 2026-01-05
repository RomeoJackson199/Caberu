# Codebase Issues Report

Generated: 2026-01-05

## Summary

This report contains a comprehensive analysis of issues found in the Caberu codebase.

---

## 1. ESLint Issues

**Total Errors and Warnings: 1,896**

### Categories:

#### 1.1 Unused Variables and Imports
**Severity: Medium**
- Hundreds of unused imports across multiple files
- Examples:
  - `src/App.tsx:187` - 'showBusinessPicker' is assigned a value but never used
  - `src/components/AppointmentCalendar.tsx:17` - 'logger' is defined but never used
  - `src/components/AppointmentCalendar.tsx:18` - 'clinicTimeToUtc' is defined but never used
  - Many components have unused icon imports from lucide-react
  - Unused component imports (e.g., AppointmentConfirmationWidget, PrescriptionManager, TreatmentPlanManager)

**Impact:** Increases bundle size, reduces code maintainability

**Recommendation:** Run `npm run lint:fix` and manually review remaining unused imports

#### 1.2 TypeScript Any Types
**Severity: High**
- Numerous instances of explicit `any` types throughout the codebase
- Examples:
  - `mcp-server/src/index.ts:501:47`
  - `src/components/AppointmentCalendar.tsx:22,29,36`
  - `src/components/CompletionSheet.tsx` - Multiple instances (lines 50, 134, 341, 342, 346, 347, etc.)
  - `src/components/DataImportManager.tsx` - Multiple instances

**Impact:**
- Loss of type safety
- Increased risk of runtime errors
- Reduced IDE autocomplete capabilities

**Recommendation:** Replace `any` with proper types or use `unknown` with type guards

#### 1.3 React Hooks Warnings
**Severity: Medium**
- Missing dependencies in useEffect hooks
- Examples:
  - `src/components/AppointmentDetailsDialog.tsx:37` - Missing 'fetchAppointmentDetails'
  - `src/components/AvailabilitySettings.tsx:91` - Missing 'fetchAvailability'
  - `src/components/CapacityDashboard.tsx:32` - Missing 'fetchCapacities'
  - `src/components/ClinicalToday.tsx:133` - Missing 'today'
  - `src/components/CompletionSheet.tsx` - Multiple missing dependencies

**Impact:**
- Potential stale closures
- Unexpected component behavior
- Possible infinite re-renders

**Recommendation:** Add missing dependencies or use useCallback/useMemo appropriately

#### 1.4 Empty Block Statements
**Severity: Low**
- `src/components/CommandPalette.tsx:266:86`
- `src/components/CompletionSheet.tsx:486:13`

**Impact:** Dead code, reduced maintainability

**Recommendation:** Remove empty blocks or add implementation

---

## 2. Test Failures

**Status: 2 test suites failed, 20 tests failed**

### 2.1 Jest Configuration Issues
**File:** `src/components/__tests__/DentalChatbot.test.tsx`

**Error:** Jest cannot parse ES modules (react-markdown)

```
SyntaxError: Unexpected token 'export'
```

**Impact:** Test suite cannot run

**Recommendation:** Configure Jest to handle ES modules:
- Update `jest.config.cjs` to include transformIgnorePatterns for react-markdown
- Or use jest.config experimental ESM support

### 2.2 Missing Test Setup
**File:** `src/components/__tests__/UnifiedDashboard.test.tsx`

**Error:** No QueryClient set - tests are not properly wrapped with providers

```
Error: No QueryClient set, use QueryClientProvider to set one
```

**Impact:** All 20 tests in UnifiedDashboard test suite fail

**Recommendation:** Wrap test components with proper providers:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <UnifiedDashboard user={mockUser} />
    </BrowserRouter>
  </QueryClientProvider>
);
```

---

## 3. Security Vulnerabilities

**Total: 2 moderate severity vulnerabilities**

### 3.1 esbuild Vulnerability
**Package:** esbuild <=0.24.2
**Severity:** Moderate
**Issue:** Enables any website to send requests to development server and read responses
**Advisory:** https://github.com/advisories/GHSA-67mh-4wv8-2f99

### 3.2 vite Dependency
**Package:** vite 0.11.0 - 6.1.6
**Severity:** Moderate
**Issue:** Depends on vulnerable versions of esbuild

**Recommendation:**
```bash
npm audit fix --force
```
Note: This will install vite@7.3.0, which is a breaking change and may require code updates.

---

## 4. Technical Debt Items

### 4.1 TODO Comments

1. **Virus Scanning Integration**
   - **File:** `supabase/functions/upload-imaging/index.ts:24`
   - **Comment:** "TODO: Integrate with actual virus scanning service"
   - **Impact:** Security risk - uploaded files are not scanned for malware
   - **Priority:** High

2. **Signature Verification**
   - **File:** `supabase/functions/elevenlabs-webhook/index.ts:89`
   - **Comment:** "TODO: Re-enable signature verification once format is confirmed"
   - **Impact:** Security risk - webhook signatures not verified
   - **Priority:** High

### 4.2 Console Statements
**Total: 810 console.log/error/warn statements across 210 files**

**Impact:**
- Production logs may expose sensitive information
- Performance impact in production
- Cluttered browser console

**Recommendation:**
- Replace console statements with proper logging library (already have logger in src/lib/logger.ts)
- Use the existing logger instead of console methods
- Configure production build to strip console statements

---

## 5. Build System Issues

### 5.1 TypeScript Compilation
**Status:** ✅ No errors found

### 5.2 Dependencies
**Status:** ⚠️ npm outdated
- npm version 10.9.4 available (current using older version)
- Several deprecated packages:
  - inflight@1.0.6
  - domexception@4.0.0
  - abab@2.0.6
  - glob@7.2.3
  - popper.js@1.16.1

---

## 6. Recommendations by Priority

### High Priority (Fix Immediately)
1. ✅ Fix security vulnerabilities in esbuild/vite
2. ✅ Implement virus scanning for file uploads
3. ✅ Re-enable webhook signature verification
4. ✅ Fix test suite configurations (Jest ESM support + QueryClient provider)
5. ✅ Replace explicit `any` types with proper types (at least in critical paths)

### Medium Priority (Fix Soon)
1. ✅ Fix React Hook dependency warnings
2. ✅ Remove unused imports and variables (run lint:fix)
3. ✅ Replace console statements with proper logger
4. ✅ Update deprecated dependencies

### Low Priority (Technical Debt)
1. ✅ Remove empty block statements
2. ✅ Clean up commented-out code
3. ✅ Update npm to latest version
4. ✅ Improve code documentation

---

## 7. Automated Fixes Available

The following can be fixed automatically:

```bash
# Fix auto-fixable linting issues
npm run lint:fix

# Fix security vulnerabilities (breaking changes)
npm audit fix --force

# Update npm
npm install -g npm@11.7.0
```

---

## 8. Next Steps

1. Review this report with the development team
2. Create GitHub issues for high-priority items
3. Prioritize fixes in upcoming sprint planning
4. Set up pre-commit hooks to prevent new issues
5. Configure CI/CD to fail on linting errors
6. Add test coverage requirements

---

**Report Generated By:** Claude Code Issue Finder
**Branch:** claude/find-issues-eV7FO
