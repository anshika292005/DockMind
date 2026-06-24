import React from 'react';
import { FileText } from 'lucide-react';

export function CitationCard({ citation, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-base border border-border rounded-lg p-3 cursor-pointer hover:border-violet/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-violet" />
        <span className="font-mono text-sm text-text-primary">{citation.filename}</span>
        <span className="text-xs bg-surface px-1.5 py-0.5 rounded border border-border ml-auto text-text-muted">
          Page {citation.page}
        </span>
      </div>
      <div className="text-xs text-text-muted font-mono leading-relaxed bg-surface p-2 rounded line-clamp-4">
        {citation.excerpt || "> The data shows significant growth in Q3..."}
      </div>
    </div>
  );
}
