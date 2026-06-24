import React from 'react';
import { useEvaluation } from '../../hooks/useEvaluation';
import { Play } from 'lucide-react';

export function EvalDashboard() {
  const { metrics, loading, running, runEval } = useEvaluation();

  const getColorClass = (val) => {
    if (val >= 0.8) return 'bg-teal';
    if (val >= 0.6) return 'bg-[#F5A623]';
    return 'bg-red-500';
  };

  const getTextColorClass = (val) => {
    if (val >= 0.8) return 'text-teal';
    if (val >= 0.6) return 'text-[#F5A623]';
    return 'text-red-500';
  };

  const MetricBar = ({ label, value }) => {
    const w = `${Math.round(value * 100)}%`;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-semibold tracking-wider text-text-muted uppercase">{label}</span>
          <span className={`text-sm font-mono ${getTextColorClass(value)}`}>{value.toFixed(2)}</span>
        </div>
        <div className="h-2 w-full bg-base rounded-full overflow-hidden flex">
          <div className={`h-full ${getColorClass(value)}`} style={{ width: w }} />
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-primary">Evaluation Metrics</h3>
        <button 
          onClick={runEval}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-violet/50 text-violet rounded hover:bg-violet/10 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {running ? (
            <div className="w-3 h-3 rounded-full border-2 border-violet border-t-transparent animate-spin" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
          {running ? 'Evaluating...' : 'Run Eval'}
        </button>
      </div>

      <div className="space-y-2 mb-6">
        <MetricBar label="Faithfulness" value={metrics.faithfulness} />
        <MetricBar label="Answer Relevancy" value={metrics.relevancy} />
        <MetricBar label="Context Recall" value={metrics.recall} />
      </div>

      <div className="mt-auto">
        <p className="text-xs text-text-muted text-center">
          Last evaluated: {new Date(metrics.lastEvaluated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </p>
      </div>

      <div className="mt-6 border-t border-border pt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 font-medium text-text-muted">Question</th>
              <th className="pb-2 font-medium text-text-muted text-right">F</th>
              <th className="pb-2 font-medium text-text-muted text-right">R</th>
              <th className="pb-2 font-medium text-text-muted text-right">C</th>
            </tr>
          </thead>
          <tbody>
            {(metrics?.questions || []).map((q, idx) => (
              <tr key={idx} className="border-b border-border/50 hover:bg-base">
                <td className="py-2 text-text-primary truncate max-w-[120px]" title={q.question}>{q.question}</td>
                <td className={`py-2 text-right font-mono ${getTextColorClass(q.faithfulness)}`}>{q.faithfulness}</td>
                <td className={`py-2 text-right font-mono ${getTextColorClass(q.relevancy)}`}>{q.relevancy}</td>
                <td className={`py-2 text-right font-mono ${getTextColorClass(q.recall)}`}>{q.recall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
