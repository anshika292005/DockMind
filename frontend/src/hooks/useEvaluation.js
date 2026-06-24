import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useEvaluation() {
  const [metrics, setMetrics] = useState({
    faithfulness: 0.84,
    relevancy: 0.71,
    recall: 0.63,
    lastEvaluated: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    questions: [
      { question: "What is the data privacy policy?", faithfulness: 0.9, relevancy: 0.85, recall: 0.7 },
      { question: "Who is the CEO?", faithfulness: 0.4, relevancy: 0.3, recall: 0.2 },
    ]
  });
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEvalResults();
      if (res.data?.metrics) {
        setMetrics({
          faithfulness: res.data.metrics.faithfulness,
          relevancy: res.data.metrics.answer_relevancy,
          recall: res.data.metrics.context_recall,
          lastEvaluated: res.data.last_evaluated_at,
          questions: res.data.per_question ?? [],
        });
      }
    } catch (e) {
      console.warn("Failed to fetch eval, using mock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const runEval = async () => {
    setRunning(true);
    try {
      await api.runEvaluation();
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    } finally {
      setRunning(false);
    }
  };

  return { metrics, loading, running, runEval, refresh: fetchResults };
}
