# backend/src/api/server.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.suites import router as suites_router
from api.routes.tests import router as tests_router
from api.routes.runs import router as runs_router
from api.routes.prompt_enhancers import router as prompt_enhancers_router


def create_app() -> FastAPI:
    app = FastAPI(title="Prompt Injection Platform Backend")

    # CORS for local dev frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8081", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(suites_router)
    app.include_router(tests_router)
    app.include_router(runs_router)
    app.include_router(prompt_enhancers_router)

    return app


app = create_app()
