from fastapi import FastAPI
from infra.persistance.db import Base, engine
from api.routes import test_router
from container import Container

Base.metadata.create_all(bind=engine)

app = FastAPI()

container = Container()

app.state.container = container

app.include_router(test_router)