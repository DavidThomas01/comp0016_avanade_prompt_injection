export type MitigationApplyResult = {
  text: string;
  notes?: Record<string, unknown>;
};

export interface Mitigation {
  id: string;
  applyInput(prompt: string): MitigationApplyResult;
  applyOutput(response: string): MitigationApplyResult;
}
