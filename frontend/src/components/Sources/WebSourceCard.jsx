import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';

export function WebSourceCard({ source }) {
  return (
    <a 
      href={source.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block bg-base border border-border rounded-lg p-3 hover:border-teal/50 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <Globe size={14} className="text-teal" />
        <span className="font-mono text-sm text-text-primary truncate">{source.domain || 'example.com'}</span>
        <ExternalLink size={12} className="text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-sm text-text-primary line-clamp-2">
        {source.title || "AI Policy Update 2026"}
      </div>
    </a>
  );
}
