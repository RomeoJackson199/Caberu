
# Multi-Practitioner Management Enhancement Plan

## Overview
This plan enhances the multi-practitioner experience for clinic admins, enabling them to view comprehensive stats across all practitioners, compare performance, and manage the team more efficiently.

## Current State Analysis
The application has basic multi-practitioner support:
- **Analytics Dashboard**: Shows individual dentist stats but lacks comparison features
- **Schedule Dashboard**: Weekly view but no filtering by practitioner
- **Team Management**: Basic list with roles, no quick actions
- **Build Errors**: Two dashboards have TypeScript issues with Supabase profile joins

## Proposed Improvements

### 1. Fix Build Errors First
**Files**: `DentistAdminScheduleDashboard.tsx`, `DentistAnalyticsDashboard.tsx`, `QRCodeDialog.tsx`

**Issues**:
- Supabase returns `profiles` as an array, but code expects a single object
- QRCodeCanvas ref type mismatch

**Solution**: Add transformation to unwrap profile arrays (following existing patterns in `DentistSelection.tsx`)

---

### 2. Create Practitioner Picker Component
**New File**: `src/components/admin/PractitionerPicker.tsx`

A reusable dropdown for admins to filter views by practitioner:
- "All Practitioners" option (default)
- Individual practitioner selection
- Avatar + name display
- Badge showing active/inactive status

This picker will be used across Analytics, Schedule, and Team pages.

---

### 3. Enhance Analytics Dashboard

**File**: `src/components/DentistAnalyticsDashboard.tsx`

**New Features**:
- **Practitioner Filter**: Add the PractitionerPicker to filter stats by individual or all
- **Comparison Mode**: Side-by-side comparison of 2-3 selected practitioners
- **Leaderboard View**: Ranked list by configurable metric (appointments, rating, completion rate)
- **Revenue Tracking**: Show earnings per practitioner (if payment data exists)
- **Export Stats**: Download CSV of performance data

**Visual Improvements**:
- Larger, more prominent stat cards for individual practitioners
- Mini charts (sparklines) showing trends over time
- Color-coded performance indicators (green/yellow/red thresholds)

---

### 4. Enhance Schedule Dashboard

**File**: `src/components/DentistAdminScheduleDashboard.tsx`

**New Features**:
- **Practitioner Filter**: Filter to show only selected practitioner(s)
- **Workload Heatmap**: Visual indicator of busy vs free slots
- **Quick Stats per Day**: Show totals at bottom of each day column
- **Click-to-View Detail**: Click appointment to see full details in a modal
- **Conflict Detection**: Highlight overlapping bookings

**Visual Improvements**:
- Better dark mode support (current uses hardcoded white)
- Responsive design improvements
- Compact mode toggle for dense schedules

---

### 5. Enhanced Team Management

**File**: `src/pages/DentistAdminUsers.tsx`

**New Features**:
- **Practitioner Stats Row**: For each dentist, show today's appointments, rating, and last active
- **Quick Actions Column**: Direct links to view schedule, analytics, or message
- **Role Management**: Inline role assignment dropdown
- **Activity Status**: Show online/offline or last seen indicator
- **Practitioner Profile Modal**: Click to see full practitioner details and stats

**Visual Improvements**:
- Avatar images for team members
- Role badges with better visual hierarchy
- Expandable rows for additional details

---

### 6. New: Practitioner Comparison Card

**New File**: `src/components/admin/PractitionerComparisonCard.tsx`

A dedicated comparison widget:
- Select 2-3 practitioners to compare
- Side-by-side metrics: appointments, completion rate, rating, cancellations
- Visual bar charts for each metric
- Highlight winner per category

---

### 7. Admin Quick Stats Header

**New File**: `src/components/admin/TeamQuickStats.tsx`

A compact header showing:
- Total practitioners (active/inactive)
- Today's total appointments across all
- Average team rating
- Pending approvals count
- This week's completed visits

---

## Technical Approach

### File Changes Summary

**Fix Build Errors**:
1. `src/components/DentistAdminScheduleDashboard.tsx` - Transform profiles array
2. `src/components/DentistAnalyticsDashboard.tsx` - Transform profiles array
3. `src/components/branding/QRCodeDialog.tsx` - Fix ref type

**New Components**:
4. `src/components/admin/PractitionerPicker.tsx` - Reusable filter dropdown
5. `src/components/admin/PractitionerComparisonCard.tsx` - Comparison widget
6. `src/components/admin/TeamQuickStats.tsx` - Quick stats header
7. `src/components/admin/index.ts` - Barrel export

**Enhance Existing**:
8. `src/components/DentistAnalyticsDashboard.tsx` - Add filter, comparison, leaderboard
9. `src/components/DentistAdminScheduleDashboard.tsx` - Add filter, heatmap, dark mode
10. `src/pages/DentistAdminUsers.tsx` - Add practitioner stats, quick actions

---

## Implementation Priority

1. **Phase 1 - Fix Errors** (Critical)
   - Fix the 3 build errors so the app compiles

2. **Phase 2 - Practitioner Picker** (Foundation)
   - Create the reusable picker component
   - Integrate into Analytics and Schedule dashboards

3. **Phase 3 - Analytics Enhancements** (High Value)
   - Leaderboard view
   - Comparison mode
   - Improved visual hierarchy

4. **Phase 4 - Schedule Enhancements** (Medium Value)
   - Filter by practitioner
   - Better dark mode support
   - Workload visualization

5. **Phase 5 - Team Management** (Polish)
   - Quick actions
   - Practitioner stats in list
   - Profile modal

---

## Technical Details

### Profile Array Fix Pattern
```typescript
// Transform profiles from array to single object (Supabase join quirk)
const formattedData = (data || []).map((item: any) => ({
  ...item,
  profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
}));
```

### PractitionerPicker Interface
```typescript
interface PractitionerPickerProps {
  selectedId: string | 'all';
  onSelect: (id: string | 'all') => void;
  showAll?: boolean; // Include "All Practitioners" option
  multiSelect?: boolean; // Allow selecting multiple
}
```

### Leaderboard Metrics
- Total appointments
- Completion rate (completed / total)
- Average rating
- Cancellation rate (lower is better)
- Patient satisfaction (from reviews)

---

## Security Considerations
- All practitioner data is already scoped by `business_id` via RLS
- Admin role verification exists in current components
- No new database changes required - uses existing queries with additional filtering
