# AutoBeat

AutoBeat is a private, offline-first music player for local audio folders with headphone-aware playback.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

The AutoBeat frontend lives in `artifacts/autobeat/src`, with `App.tsx` as the source of truth for local playback and `index.css` for visual tokens.

## Architecture decisions

- The first MVP is frontend-only and keeps track metadata, settings, and playback position in localStorage.
- Local audio bytes are never uploaded or copied into the project; selected `File` objects are held in memory for playback.
- Browser `mediaDevices` output events provide best-effort headphone awareness; native Windows startup, tray, and device APIs belong in the future desktop shell.

## Product

- Browse a local folder and recursively index MP3, WAV, M4A, and FLAC files.
- Search and filter tracks by filename-derived name and category.
- Play, pause, stop, skip, adjust volume, shuffle, and cycle repeat modes.
- Choose a default track and configure startup, resume, headphone autoplay, and disconnect behavior.

## User preferences

- Personal use only; no accounts, subscriptions, streaming providers, or cloud music.

## Gotchas

- Browser security prevents reliable system-wide Windows headphone detection and automatic startup; the settings screen explains this boundary.
- `File` objects are not serializable, so after a browser reload a previously indexed track must be selected again before it can play.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
