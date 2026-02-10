# CLAUDE.md - Caberu Dental Practice Management System

## Project Overview

Caberu is a production-ready, AI-powered dental practice management platform built with React/TypeScript and Supabase. It handles appointment scheduling, patient records, billing, inventory, analytics, communications, and more with HIPAA/GDPR compliance.

## Tech Stack

- **Frontend:** React 18, TypeScript 5.9, Vite 5.4, Tailwind CSS 3.4
- **UI Components:** shadcn/ui (Radix primitives), Lucide icons, Framer Motion
- **State Management:** React Context (app state), TanStack React Query v5 (server state)
- **Forms:** React Hook Form + Zod validation
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth, Realtime, Storage)
- **Payments:** Stripe
- **Communications:** Twilio (SMS), ElevenLabs (voice AI)
- **Video Generation:** Remotion 4.0 (marketing videos)

## Project Structure

```
src/
  components/     # 45+ feature-based component directories
  pages/          # ~50 route page components
  hooks/          # 50+ custom React hooks (useXxx pattern)
  contexts/       # React context providers
  integrations/   # Supabase client configuration
  lib/            # 50+ utility modules
  types/          # TypeScript type definitions by domain
  utils/          # Validation, security, performance utilities
  styles/         # Global stylesheets
supabase/
  functions/      # 59 Edge Functions (serverless backend)
  migrations/     # PostgreSQL schema migrations
remotion/         # Video generation components
docs/             # Extended documentation
```

## Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (70% threshold)

# Linting
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues
npm run fix:types        # Run fix-lint-errors.js script

# Video
npm run video            # Remotion studio
npm run video:render     # Render marketing video
```

## Code Conventions

### TypeScript
- Strict mode enabled: `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`
- No `any` types (`@typescript-eslint/no-explicit-any: "error"`)
- No unused variables (`@typescript-eslint/no-unused-vars: "error"`)
- Path alias: `@/*` maps to `./src/*`

### React Patterns
- Functional components only, with hooks
- Components: PascalCase filenames (e.g., `AppointmentCalendar.tsx`)
- Hooks: `useXxx` pattern (e.g., `useAuth.ts`, `useAppointments.tsx`)
- Utilities: camelCase filenames (e.g., `appointmentUtils.ts`)
- Types: PascalCase in domain-named files (e.g., `appointment.ts`, `patient.ts`)

### Imports
- Use absolute imports with `@/` alias: `import { Button } from '@/components/ui/button'`
- shadcn/ui components live in `src/components/ui/`

### Styling
- Tailwind CSS utility classes (no separate CSS files per component)
- Use `cn()` helper (from `clsx` + `tailwind-merge`) for conditional classes
- Design system documented in `DESIGN_SYSTEM.md`

### State Management
- React Context for app-level state (auth, theme, etc.)
- TanStack React Query for all server state (fetching, caching, mutations)
- Optimistic updates for mutations where appropriate

## ESLint Configuration

- Flat config format (`eslint.config.js`)
- Extends: `@eslint/js` recommended + `typescript-eslint` recommended
- Plugins: `react-hooks`, `react-refresh`
- Ignored directories: `dist`, `node_modules`, `supabase/functions`

## Testing

- Framework: Jest 29 with ts-jest and jsdom environment
- Libraries: `@testing-library/react`, `@testing-library/jest-dom`
- Test file locations: `src/**/__tests__/**/*.{ts,tsx}` or `src/**/*.{test,spec}.{ts,tsx}`
- CSS imports mocked with `identity-obj-proxy`
- Coverage threshold: 70% across branches, functions, lines, and statements

## Security Considerations

- HIPAA-compliant: patient data is protected with Row Level Security (RLS)
- HTML sanitized with DOMPurify to prevent XSS
- Auth managed by Supabase Auth with 2FA support
- Role-Based Access Control (RBAC) enforced at database level
- Sensitive data never logged in production (console.log stripped in build)
- See `SECURITY_AUDIT_REPORT.md` and `SECURITY_NOTES.md` for details

## Environment Variables

Required in `.env` (see `.env.example`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional:
- `VITE_VAPID_PUBLIC_KEY` - Web push notifications
- `VITE_ENABLE_PERFORMANCE_MONITORING` - Production performance tracking

## Supabase Edge Functions

59 serverless functions organized by domain:
- **Auth:** `claim-profile`, `send-2fa-code`, `verify-2fa-code`, `send-sms-verification`
- **Communications:** `send-sms`, `send-email-notification`, `send-appointment-reminders`
- **AI:** `dental-ai-chat`, `voice-call-ai`, `appointment-ai-assistant`, `ai-slot-recommendations`
- **Payments:** `create-subscription-checkout`, `stripe-subscription-webhook`, `create-payment-request`
- **Integrations:** `google-calendar-oauth`, `google-calendar-sync`, `elevenlabs-webhook`
- **Data:** `process-csv-import`, `generate-data-export`, `upload-imaging`

Edge Functions are deployed via GitHub Actions (`.github/workflows/deploy-supabase-functions.yml`).

## Key Documentation

- `DESIGN_SYSTEM.md` - UI/UX guidelines, color palette, typography
- `DEPLOYMENT_INSTRUCTIONS.md` - Deployment to Vercel, Netlify, etc.
- `SECURITY_AUDIT_REPORT.md` - Security findings and remediations
- `TEMPLATE_SYSTEM_GUIDE.md` - Business template system
- `docs/multi-tenancy.md` - Multi-tenant architecture
- `docs/NOTIFICATION_SYSTEM.md` - Real-time notification system
