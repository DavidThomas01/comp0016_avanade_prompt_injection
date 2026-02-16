from domain.config.mitigations import MITIGATION_REGISTRY

class PromptCompiler:

    @staticmethod
    def compile(mitigations, system_prompt) -> str:
        
        if mitigations:
            
            if system_prompt == None:
                system_prompt = ""

            system_prompt.append("For security, you must follow these instructions:")
            
            for mitigation in mitigations:
                mitigation_config = MITIGATION_REGISTRY.get(mitigation)
                
                if not mitigation_config:
                    raise ValueError("mitigation is not defined in the platform")
                
                if mitigation_config.layer == "prompt":
                    system_prompt.append("\n" + mitigation_config.prompt_message)

        return system_prompt