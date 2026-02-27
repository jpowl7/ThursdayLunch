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
- `src/app/page.tsx` — Landing page (create/join group)
- `src/app/g/[slug]/page.tsx` — Group participant view
- `src/app/g/[slug]/admin/page.tsx` — Group admin dashboard
- `src/lib/db/queries.ts` — All SQL queries (single source of DB truth)
- `src/lib/schemas/` — Zod validation schemas
- `src/hooks/useEventStream.ts` — SSE + polling fallback

## Conventions
- Named exports only (no default exports), except Next.js pages which require default exports
- All DB access through `src/lib/db/queries.ts`
- Zod validation on every API route
- `"use client"` only when needed (state, effects, browser APIs)
- Never edit `src/components/ui/` (shadcn auto-generated)
- Error responses as `{ error: string }`
- Admin auth: each group has a 4-digit passcode (sent as Bearer token)

## Environment
- `DATABASE_URL` — Neon pooled connection string
- `NEXT_PUBLIC_APP_URL` — Public app URL
