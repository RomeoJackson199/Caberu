# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Caberu is a dental practice management platform (React 18/TypeScript/Vite) with Supabase backend. It supports multiple business types through a template system (dental, medical, hair salon, personal training, beauty salon, generic).

## Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:8080)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (70% threshold)

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint errors
npm run fix:types        # Run scripts/fix-lint-errors.js

# Remotion video rendering
npm run video            # Open Remotion studio
npm run video:render     # Render marketing video
```

### Running a Single Test
```bash
npm run test -- path/to/file.test.ts
npm run test -- --testNamePattern="test name"
```

## Architecture

### Frontend Structure
- **`src/pages/`** - Route-level components (React Router v6)
- **`src/components/`** - 45+ component directories organized by domain (appointments, payments, patients, dentist, etc.)
- **`src/components/ui/`** - shadcn/ui primitives (Radix-based)
- **`src/hooks/`** - Custom hooks (auth, business context, appointments, undo manager)
- **`src/lib/`** - Utilities, validation schemas, translations, AI integrations
- **`src/integrations/supabase/`** - Supabase client and auto-generated types

### Key Architectural Patterns

**Authentication**: Singleton auth listener pattern in `useAuth.ts` prevents multiple auth subscriptions. Use `useAuth()` hook for auth state, `useHasRole()` for role checks.

**Business Context**: Multi-tenant via `useBusinessContext()`. Businesses have a `template_type` that controls feature availability. Always wrap template-specific features:
```tsx
const { hasFeature, t } = useBusinessTemplate();
{hasFeature('prescriptions') && <PrescriptionManager />}
<h1>{t('customerPlural')}</h1>  // "Patients" or "Clients" based on template
```

**State Management**: TanStack React Query v5 for server state. Optimistic updates with undo support via `useUndoManager` and domain-specific hooks (`useInventoryActionsWithUndo`, etc.).

**Session Timeout**: GDPR-compliant 15-minute auto-logout in Supabase client.

### Backend (Supabase)
- **57 Edge Functions** in `supabase/functions/` - AI assistants, Stripe integration, notifications, auth flows
- **415 migrations** in `supabase/migrations/`
- Row Level Security (RLS) for multi-tenant data isolation
- Business-scoped queries via `session_business` table pattern

### Type System
- `src/integrations/supabase/types.ts` - Auto-generated database types (185K lines)
- `src/types/` - Domain types (appointment, patient, dental, etc.)

## Design System

Use semantic color tokens, never hardcoded colors:
```tsx
// Correct
<div className="bg-primary text-primary-foreground">
<Badge className="bg-success text-success-foreground">

// Wrong
<div className="bg-blue-500 text-white">
```

Currency formatting: Always use `useCurrency` hook for consistent display.

See `DESIGN_SYSTEM.md` for full guidelines.

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Optional:
```
VITE_VAPID_PUBLIC_KEY=your_vapid_key  # For push notifications
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

Sensitive keys (Twilio, Stripe, service role) go in Supabase Edge Function secrets only.

## Import Aliases

```tsx
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

## ESLint Rules

Strict TypeScript:
- `@typescript-eslint/no-unused-vars: "error"`
- `@typescript-eslint/no-explicit-any: "error"`

React hooks plugin enabled. Supabase functions ignored in lint.

## User Roles

- **Patients**: Book appointments, view records, manage payments
- **Dentists/Providers**: Manage appointments, access patient records, prescriptions
- **Admin**: Multi-location, user management, system config
- **Super Admin**: Platform-wide administration

## Key Files Reference

- `src/App.tsx` - Main router and providers setup
- `src/hooks/useBusinessContext.tsx` - Multi-tenant business switching
- `src/hooks/useAuth.ts` - Consolidated auth state
- `src/lib/businessTemplates.ts` - Template configurations
- `src/integrations/supabase/client.ts` - Supabase client with session timeout
