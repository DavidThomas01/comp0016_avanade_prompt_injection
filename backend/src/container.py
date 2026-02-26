from app.tests import TestService
from app.runner_router import RunnerRouter
from infra.persistance.repositories import TestRepository


class Container:
    def __init__(self):
        self._build_test_module()
        
    
    def _build_test_module(self):
        self.test_repo = TestRepository()
        self.runner_router = RunnerRouter()
        self.test_service = TestService(self.test_repo, self.runner_router)
