from fastapi import FastAPI
from infra.persistance.db import Base, engine
from api.routes import test_router

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(test_router)