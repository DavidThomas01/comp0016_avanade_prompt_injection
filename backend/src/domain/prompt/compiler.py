from infra.config.mitigations import MITIGATION_REGISTRY
from typing import Optional, List

from core.exceptions import UnknownMitigation
from domain.mitigations import MitigationLayer

class PromptCompiler:

    @staticmethod
    def compile(mitigations: List[str], system_prompt: Optional[str] = None) -> str:
        
        if mitigations:
            
            if system_prompt == None:
                system_prompt = ""

            system_prompt += "For security, you must follow these instructions:"
            
            for mitigation in mitigations:
                mitigation_config = MITIGATION_REGISTRY.get(mitigation)
                
                if not mitigation_config:
                    raise UnknownMitigation("mitigation is not defined in the platform")
                
                if mitigation_config.layer == MitigationLayer.PROMPT:
                    system_prompt += "\n" + mitigation_config.prompt_message

        return system_prompt