from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 - ensures all models are registered on Base before create_all
from app.core.database import Base, SessionLocal, engine
from app.models.plot_state import PlotState
from app.models.seed import SeedType
from app.models.user import User
from app.routers import (
    health,
    inventory,
    planted_items,
    plots,
    seed_types,
    sessions,
    tools,
    users,
)

app = FastAPI(title="Study Garden API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before any real-world deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


def _seed_defaults() -> None:
    """Ensures a default user, starter seed/tool types, and a small tilled
    starter patch exist. Placeholder seeding for local dev/testing - a
    real signup/setup flow isn't needed for a two-person app.
    """
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(name="Candy")
            db.add(user)
            db.flush()  # need user.id below even before the outer commit

        if not db.query(SeedType).filter_by(key="daisy").first():
            db.add(
                SeedType(
                    key="daisy",
                    display_name="Daisy",
                    category="seed",
                    unlock_cost_minutes=0,  # unlocked from the very start, per design
                    # NOTE: intentionally short for local testing - raise
                    # these before real use.
                    earn_cost_minutes=1,
                    growth_duration_minutes=5,
                )
            )

        if not db.query(SeedType).filter_by(key="hoe").first():
            db.add(
                SeedType(
                    key="hoe",
                    display_name="Hoe",
                    category="tool",
                    unlock_cost_minutes=0,
                    earn_cost_minutes=2,  # also short for local testing
                    growth_duration_minutes=None,
                    max_durability=100,
                )
            )

        # Small starter patch (3x3, center of the 9x9 grid) tilled by
        # default so there's something plantable before she's earned a hoe.
        if not db.query(PlotState).filter_by(user_id=user.id).first():
            for x in range(3, 6):
                for y in range(3, 6):
                    db.add(PlotState(user_id=user.id, plot_x=x, plot_y=y, tilled=True))

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    _seed_defaults()


app.include_router(health.router)
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(seed_types.router, prefix="/seed-types", tags=["seed-types"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(planted_items.router, prefix="/planted-items", tags=["planted-items"])
app.include_router(plots.router, prefix="/plots", tags=["plots"])
app.include_router(tools.router, prefix="/tools", tags=["tools"])
