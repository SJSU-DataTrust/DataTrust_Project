from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.analyze import router as analyze_router
from app.routers.retrieval import router as retrieval_router
from app.routers.ingestion import router as ingestion_router
from app.routers.verification import router as verification_router

app = FastAPI(title="DataTrust Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://136.111.123.202",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(analyze_router, tags=["policy"])
app.include_router(retrieval_router, tags=["retrieval"])
app.include_router(ingestion_router, tags=["ingestion"])
app.include_router(verification_router, tags=["verification"])
