from datetime import datetime
from typing import Optional

# Kept deliberately simple for the MVP: four even stages. Revisit if a
# plant ever needs asymmetric stage timing (e.g. a long "bud" phase).
STAGES = ["seed", "sprout", "bud", "bloom"]


def compute_stage(planted_at: datetime, growth_duration_minutes: Optional[int]) -> str:
    """Growth stage is always derived from real elapsed time, never stored -
    this is what lets a plant keep growing whether or not she's focusing.
    """
    if not growth_duration_minutes:
        return STAGES[-1]

    elapsed_minutes = (datetime.utcnow() - planted_at).total_seconds() / 60
    fraction = min(elapsed_minutes / growth_duration_minutes, 1.0)
    index = min(int(fraction * len(STAGES)), len(STAGES) - 1)
    return STAGES[index]
