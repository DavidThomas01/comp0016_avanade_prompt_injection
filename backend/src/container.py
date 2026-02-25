from app.tests import TestService
from infra.persistance.repositories import TestRepository

class Container:
    def __init__(self):
        self._build_test_module()
        
    
    def _build_test_module(self):
        self.test_repo = TestRepository()
        self.test_service = TestService(self.test_repo)
