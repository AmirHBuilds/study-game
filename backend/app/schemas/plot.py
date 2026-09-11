from pydantic import BaseModel


class PlotStateResponse(BaseModel):
    plot_x: int
    plot_y: int
    tilled: bool

    class Config:
        from_attributes = True
