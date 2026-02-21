# Thursday Lunch PWA

## Stack
Next.js 15 · TypeScript · Neon (Postgres) · Tailwind CSS v4 · shadcn/ui · Zod

## Commands
- `npm run dev` — Dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run type-check` — TypeScript check
- `npm run db:migrate` — Apply migrations to Neon
- `npm run db:seed` — Seed dev data

## Key Files
- `src/app/page.tsx` — Participant view
- `src/app/admin/page.tsx` — Admin dashboard
- `src/lib/db/queries.ts` — All SQL queries (single source of DB truth)
- `src/lib/schemas/` — Zod validation schemas
- `src/hooks/useEventStream.ts` — SSE + polling fallback

## Conventions
- Named exports only (no default exports)
- All DB access through `src/lib/db/queries.ts`
- Zod validation on every API route
- `"use client"` only when needed (state, effects, browser APIs)
- Never edit `src/components/ui/` (shadcn auto-generated)
- Error responses as `{ error: string }`

## Environment
- `DATABASE_URL` — Neon pooled connection string
- `ADMIN_TOKEN` — Bearer token for admin routes
- `NEXT_PUBLIC_APP_URL` — Public app URL
