from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    yield
    await engine.dispose()


app = FastAPI(title="Grok Organizer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}
