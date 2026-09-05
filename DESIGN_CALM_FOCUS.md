# Calm Focus Design System — LOCKED (ui-calm-focus)

> **Future agents: this file wins.** Chosen by user via Lavish review on 2026-09-04
> (Concept C — Calm Focus, Slow & buttery 900ms). Inspired by awwwards.com/jobs.
> Do NOT reintroduce Neo-Brutalism (thick black borders, hard offset shadows,
> 150ms snaps, 3-column OS grid, yellow/green/purple command-center).

## Decision

- Direction: **C — Calm Focus**
- Motion: **Slow & buttery, 900ms**, easing `cubic-bezier(.16,1,.3,1)`
- Text: **minimal** — list shows title + company + 1 meta line only. Details on demand.
- Branch: `ui-calm-focus` | Worktree: `Job Search.worktrees/calm-focus`

## Tokens

```css
--paper: #fafaf7; /* page bg */
--ink: #111111; /* text */
--muted: rgba(17, 17, 17, 0.55);
--line: rgba(17, 17, 17, 0.08); /* hairline only, never 3px black */
--card: #ffffff;
--radius: 22px; /* cards */
--radius-pill: 999px;
--ease: cubic-bezier(0.16, 1, 0.3, 1);
--slow: 900ms;
--med: 600ms;
--fast: 350ms;
```

Forbidden: `border-3`, `border-4`, `brutal-shadow-*`, `bg-yellow`, `bg-green`,
`bg-purple` as chrome, `control-radio`, `control-checkbox` brutalist inputs.

## Type

- Display/serif: `Instrument Serif` (job titles, hero: "What do you want next?")
- UI: `Inter` (body, meta)
- Never uppercase labels everywhere. Sentence case, 13–15px meta in muted.

## Layout (C)

- Single centered column, `max-w-4xl`, airy `px-6 py-14`.
- Top: tiny uppercase eyebrow + count, centered serif hero, centered search pill.
- Filters: 3–4 pills only (All / Remote / Full-time / Senior). Advanced filters
  collapse into "More filters" disclosure — never a 280px sidebar.
- List: stacked calm cards, `fadeUp 900ms` staggered `animation-delay: i*60ms`.
- Focus mode: hovering a card dims siblings (`opacity:.35 + blur(.5px)` on wrapper).
- Detail: calm overlay sheet (rounded-3xl, hairline border, soft shadow
  `0 20px 50px -20px rgba(0,0,0,.18)`), NOT yellow header + 4px border.
- Pagination: minimal dots/pills, no brutalist circles.

## Motion (900ms buttery)

- All transitions use `var(--ease)`, 600–900ms. No 150ms snaps.
- Cards: `translateY(-4px)` + soft shadow on hover.
- List entrance: `fadeUp` staggered.
- Search filter: client-side, no full-page flash. Server list streams behind
  `<Suspense fallback={<CalmSkeleton/>}>` so hero stays interactive.
- `prefers-reduced-motion: reduce` disables all motion.
- Next.js: client navigations via `router.push('/?…')` must keep static shell
  (hero/search/pills) outside the Suspense boundary that wraps the job list.
  See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`
  — Suspense placement matters; root fallback alone is not enough.

## Minimal-text rules

- Card: company (11px uppercase muted) + serif title (24px) + `location · salary`
  (13px muted) + max 3 skill pills. Nothing else.
- "Save →" text link, not buttons row. Counts only where needed.
- Empty state: one serif line + one muted line. No panels of instructions.

## Files that enforce this

- `src/app/globals.css` — tokens, calm-card, chip, fadeUp, skeleton, focus-dim
- `src/app/layout.tsx` — fonts (Inter + Instrument Serif), paper bg
- `src/app/page.tsx` — centered hero + Suspense-streamed list
- `src/components/JobFilters.tsx` — search pill + 4 pills + More disclosure
- `src/components/JobCard.tsx` — calm card
- `src/components/JobDetailPanel.tsx` — calm sheet (logic untouched)
- `src/components/Pagination.tsx`, `RefreshButton.tsx` — minimal pills
