# Frontend conventions (Zona Gol web)

React 19 + Vite + TypeScript (strict) + Tailwind v4 + shadcn/ui (new-york) +
TanStack Query + React Router 7. The UI talks **only** to the Go API
(`backend/`, routes in `backend/api/ROUTES.md`, contract in
`backend/CONVENTIONS.md` → API contract).

## Layout

```
src/app/            router, layouts, Area registry (do not edit from a feature task)
src/components/ui/  vendored shadcn/ui kit — reuse, don't fork
src/components/states.tsx  LoadingState, EmptyState, ErrorState, QueryState
src/lib/api/client.ts      typed fetch client (api.get/list/post/patch/put/delete), ApiError
src/lib/auth/              AuthProvider/useAuth, RequireRole (UI guard only)
src/features/<area>/       one folder per area, owns its routes.tsx
src/features/leagues/      shared league/tournament types + hooks (reference implementation)
```

Each area exports `area: Area` from its `routes.tsx` (public routes,
dashboard routes with roles, nav items). Never edit `src/app/router.tsx`,
layouts, `lib/` or another area's folder from a feature task; if you need a
shared change, say so in your report.

Inside an area:

| File | Purpose |
|---|---|
| `types.ts` | TS types mirroring the Go JSON (snake_case, optional = `omitempty`/pointer) |
| `api.ts` | query keys + `useQuery`/`useMutation` hooks; the only place that calls `api.*` |
| `*-page.tsx` | route components: compose sections, no fetch logic |
| `components/*.tsx` | presentational pieces; props in, events out |
| `*.test.tsx` | Vitest + Testing Library, `mockApi` + `renderWithProviders` from `@/test/render` |

Keep files under ~300 lines. The legacy files of 1,000–2,500 lines must be
split by responsibility (list, filters, form dialog, row actions…).

## Data

- Read with hooks from `api.ts` + `<QueryState>` (loading → error with retry →
  empty → data). Never `useEffect` + `fetch`, never Supabase for data.
- Lists use `api.list<T>(path, page)` and read `res.data` / `res.page`.
- Mutations use `useMutation`; on success invalidate the affected query keys
  and show a `toast` (sonner). On error show `ApiError.message`; for 422 map
  `error.fields` to the form fields.
- Never compute permissions client-side to decide what the API returns; hiding
  a button is UX, the API is the authority. Handle 403 gracefully.
- If an endpoint the screen needs does not exist in `ROUTES.md`, do not fake
  it: render what you can and list the missing endpoint in your report.

## UX & accessibility (mandatory)

- Semantic HTML first: `<a>`/`<Link>` to navigate, `<button>` to act, one
  `<h1>` per page, ordered headings, `<ul>` for lists, `<table>` for tables.
- Every input has a visible `<Label>`; errors next to the field with
  `aria-invalid` + `aria-describedby`; keep values after a failed submit;
  disable submit while pending but keep its text meaningful ("Guardando…").
- Destructive actions ask for confirmation (`AlertDialog`).
- Dialogs/menus: use the shadcn/Radix components (they manage focus).
- Icons are `aria-hidden` unless they are the only content of a control, then
  the control gets an accessible name.
- Mobile first: no horizontal page scroll; wide tables scroll inside an
  `overflow-x-auto` wrapper; respect `motion-reduce`.
- Keep the visual identity: colors from the tokens in `src/styles/globals.css`
  (`bg-primary`, `text-muted-foreground`…), no hard-coded hex colors for new UI.
- User-facing text in Spanish (Mexico). No invented data, stats or testimonials.

## Quality gate (run before reporting)

```
npx tsc -b && npx eslint . && npx vitest run
```

Each page needs tests for: data rendered, empty state, API error, and each
mutation's success + validation error. No `any`, no `// @ts-ignore`, no
`eslint-disable`. Never run git commands. Never add dependencies.

## Testing mutations (mandatory pattern)

Reference: `src/features/league-admin/competition/components/whatsapp-form.test.tsx`.

A test whose title says it creates/saves/deletes/publishes something must:

1. drive the UI like a user: `const { user } = renderWithProviders(...)`,
   `await user.click(...)`, `await user.type(...)` (never call hooks directly);
2. assert the exact request: `requestsTo(fetchMock, 'POST /path')` returns the
   parsed bodies sent to that endpoint — assert path params AND body;
3. assert the visible outcome: toast text, refreshed data, or the field error
   with `aria-invalid="true"` and the typed value still present.

A test that only checks that a heading renders is not a mutation test. Tests
that "pass" without exercising behaviour are treated as missing.

`src/test/setup.ts` already polyfills what Radix needs in JSDOM
(pointer capture, scrollIntoView, ResizeObserver, matchMedia): Select,
Dialog and DropdownMenu can be driven with `userEvent`. Do not skip tests
for "JSDOM limitations".

## Inputs are uppercased

The shadcn `Input`/`Textarea` in this project (carried over from the legacy
app) uppercase typed text, except password/email/url/number/date/time/file
inputs, fields whose id/name contains "password", and `forceLowercase`.
Tests must expect the uppercased value in request bodies.

## Error handling note

`ApiError.fields` is always an object (possibly empty): check
`Object.keys(err.fields).length > 0`, never `if (err.fields)`.
