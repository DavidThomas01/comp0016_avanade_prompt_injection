from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from infra.persistance.db import Base, engine
from api.routes import *
from container import Container

Base.metadata.create_all(bind=engine)

load_dotenv()

app = FastAPI(title="Prompt Injection Platform Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

container = Container()

app.state.container = container

app.include_router(test_router)
app.include_router(chat_router)
app.include_router(enhancer_router)
app.include_router(models_router)
app.include_router(mitigations_router)
app.include_router(test_config_router)