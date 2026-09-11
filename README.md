# Grow a World — Study Garden

A cozy 2D garden game where focused study sessions earn plants, tools, and
decorations for a personal garden. See the design docs shared alongside this
scaffold for the full game design and reward-system rationale.

## Stack

- **Frontend:** Next.js + Phaser 3 (game rendering lives in a single
  `<GameCanvas />` component; everything else is normal React/Next.js UI)
- **Backend:** FastAPI + SQLAlchemy
- **Database:** PostgreSQL
- **Orchestration:** Docker Compose

## Running it

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000 (try http://localhost:8000/health)
- Postgres: localhost:5432

On first startup the backend seeds one default user ("Candy") and one
starter seed type (Daisy), which is unlocked from the very start per the
design. **Daisy's costs are intentionally tiny for local testing** —
1 minute of focus to earn a copy, 5 minutes of real-time growth — so you
can play through the whole loop in a couple of minutes instead of waiting
on real durations. Raise `earn_cost_minutes` / `growth_duration_minutes`
in `backend/app/main.py` (`_seed_defaults`) to real values before actual
use, or move seeding into a proper admin flow later.

The backend also creates its tables automatically on startup for now
(`Base.metadata.create_all`). Swap this for real Alembic migrations
once the schema stops changing every day — `alembic` is already in
`requirements.txt`, it just isn't wired up yet.

## What's playable right now

This is the first real end-to-end slice:

1. **Home (`/`)** — Start Focus and Garden both navigate somewhere real now.
   Achievements/Shop/Settings are still inert placeholders.
2. **Focus (`/focus`)** — pick Daisy (the only unlocked seed) → confirm →
   a real session starts against the backend → a live countdown (recomputed
   from the server's `started_at` timestamp, not a naive local timer) →
   "I'm studying elsewhere" pauses it → on completion, `/complete` is
   called and the server validates elapsed time before delivering anything.
3. **Garden (`/garden`)** — shows the static Phaser 9x9 grid, your
   inventory (earned but unplaced seeds), a "Plant in next open plot"
   button, and your planted items with their growth stage — which is
   computed live from real elapsed time, not stored.

Garden access is **not gated** behind the 1-hour achievement yet on
purpose, so you can test the full loop without waiting — that gate
belongs to the achievements system below.

## Still to build

- **Achievements screen** + the lifetime-minutes milestone track
  (1 hr → 3x3 garden unlock, etc.) — and then actually gate Garden
  access behind it
- **Seeds tab** — locked seed types with their own dedicated
  unlock-progress bar (the `UnlockProgress` model and `goal_type:
  "unlock"` reward path already exist in the backend, just nothing
  in the UI surfaces it yet)
- **Shop** — redeeming banked-time tokens (`goal_type: "bank"` already
  delivers a token to inventory; spending one against an item's earn
  cost isn't built)
- Watering (free) and the hoe (earned, with durability)
- Click-to-place in the actual Phaser canvas, instead of the
  "next open plot" button (currently a placeholder interaction so the
  loop is testable without building full canvas drag-and-drop yet)
- Visual/atmosphere polish: real art, day/night tint, wind PNG overlay,
  grass sway, growth-stage sprites instead of a text label

## Project layout

```
backend/app/
  core/        # config, db session
  models/      # SQLAlchemy tables
  schemas/     # Pydantic request/response shapes
  routers/     # FastAPI route handlers
  services/    # business logic (session validation, reward delivery, growth calc)

frontend/
  app/                    # Next.js routes (/, /focus, /garden)
  components/game/        # Phaser mount point (GameCanvas)
  lib/                    # typed API client
```

Keep game logic inside `components/game/` framework-agnostic where
possible (no React imports inside the Phaser scene classes) — that's
what keeps a future native-shell reuse of the same game code realistic.
