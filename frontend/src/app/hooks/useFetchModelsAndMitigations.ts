import { useState, useEffect } from 'react';
import { fetchModels, fetchMitigations, Model, Mitigation } from '../api/promptEnhancerClient';

interface UseFetchModelsAndMitigationsReturn {
  models: Model[];
  mitigations: Mitigation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFetchModelsAndMitigations(): UseFetchModelsAndMitigationsReturn {
  const [models, setModels] = useState<Model[]>([]);
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [modelsData, mitigationsData] = await Promise.all([
        fetchModels(),
        fetchMitigations(),
      ]);
      setModels(modelsData);
      setMitigations(mitigationsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Failed to load models and mitigations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    models,
    mitigations,
    isLoading,
    error,
    refetch: loadData,
  };
}
