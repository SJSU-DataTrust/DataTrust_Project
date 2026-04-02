from fastapi import FastAPI
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.analyze import router as analyze_router

app = FastAPI(title="DataTrust Backend")

app.include_router(health_router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(analyze_router, tags=["policy"])