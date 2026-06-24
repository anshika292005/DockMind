import React from 'react';
import { FileText, Search, Globe, ChevronDown, ChevronUp } from 'lucide-react';

export function AgentStepTimeline({ steps }) {
  const [expanded, setExpanded] = React.useState(true);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="w-full mb-6 border border-border rounded-lg bg-surface/50 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-text-primary hover:bg-base/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Search size={16} className="text-violet" />
          Deep Research Trace
        </span>
        {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
      </button>
      
      {expanded && (
        <div className="p-4 pt-2 border-t border-border space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3 relative">
              {/* Timeline line */}
              {idx < steps.length - 1 && (
                <div className="absolute left-2.5 top-6 bottom-[-12px] w-[1px] bg-border" />
              )}
              
              <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-base border border-border flex items-center justify-center mt-0.5">
                {step.type === 'search_docs' ? <FileText size={10} className="text-violet" /> :
                 step.type === 'search_web' ? <Globe size={10} className="text-teal" /> :
                 <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />}
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-text-primary">{step.text}</p>
                <p className="text-xs text-text-muted mt-0.5">{step.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
