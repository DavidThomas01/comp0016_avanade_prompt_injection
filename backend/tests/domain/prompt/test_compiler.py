import pytest

from domain.prompt.compiler import PromptCompiler
from core.exceptions import UnknownMitigation

@pytest.fixture
def ctx():
    
    class Ctx():
        pass
    
    ctx = Ctx()
    ctx.compiler = PromptCompiler
    return ctx

def test_known_mitigation_with_prompt_success(ctx):
    initial_prompt = "=== SYSTEM PROMPT ==="
    
    prompt = ctx.compiler.compile(["delimiter_tokens"], initial_prompt)
    
    assert prompt
    assert initial_prompt in prompt


def test_known_mitigation_without_prompt_success(ctx):
    prompt = ctx.compiler.compile(["delimiter_tokens"])
    
    assert prompt


def test_unknown_mitigation_fails(ctx):
    with pytest.raises(UnknownMitigation):
        ctx.compiler.compile(["missing"])