import React from 'react';
import { Sparkles, FileText, Globe, BarChart2 } from 'lucide-react';

const suggestions = [
  { icon: FileText, text: 'Summarize the key findings in this document' },
  { icon: Globe, text: 'What are the main policy changes mentioned?' },
  { icon: BarChart2, text: 'Extract all statistics and data points' },
  { icon: Sparkles, text: 'What conclusions does the author draw?' },
];

export function WelcomeScreen({ onSuggestionClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center select-none">
      <div className="mb-6">
        <div className="w-14 h-14 rounded-2xl bg-violet/10 border border-violet/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="text-violet" size={28} />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-1">DocMind AI</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Upload PDFs in the sidebar, then ask questions grounded in your documents.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mt-2">
        {suggestions.map(({ icon: Icon, text }, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(text)}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface hover:border-violet/40 hover:bg-violet/5 text-left transition-all group"
          >
            <Icon size={16} className="text-text-muted group-hover:text-violet mt-0.5 shrink-0 transition-colors" />
            <span className="text-sm text-text-muted group-hover:text-text-primary transition-colors">{text}</span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-text-muted mt-8 opacity-60">
        Responses are grounded in your uploaded documents only
      </p>
    </div>
  );
}
