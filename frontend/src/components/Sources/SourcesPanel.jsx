import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Tabs } from '../../ui/Tabs';
import { CitationCard } from './CitationCard';
import { WebSourceCard } from './WebSourceCard';
import { EvalDashboard } from './EvalDashboard';

export function SourcesPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('Sources');

  // Mock citations
  const citations = [
    { id: 1, filename: 'report.pdf', page: 3, excerpt: '> The data shows significant growth in Q3...' },
    { id: 2, filename: 'policy.pdf', page: 7, excerpt: '> As per section 4.2, all personnel must...' },
  ];

  const webSources = [
    { id: 1, domain: 'techcrunch.com', url: 'https://techcrunch.com', title: 'AI Policy Update 2026' },
  ];

  return (
    <div className="flex flex-col h-full w-full relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-text-muted hover:text-text-primary lg:hidden z-10"
      >
        <X size={20} />
      </button>

      <div className="p-4 border-b border-border flex justify-center shrink-0">
        <Tabs 
          tabs={[
            { id: 'Sources', label: 'Sources' },
            { id: 'Evaluation', label: 'Evaluation' }
          ]} 
          activeTab={activeTab} 
          onChange={setActiveTab}
          className="w-full max-w-[280px]"
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'Sources' ? (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Document Citations</h3>
              <div className="space-y-2">
                {citations.map(cit => (
                  <CitationCard key={cit.id} citation={cit} />
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Web Sources</h3>
              <div className="space-y-2">
                {webSources.map(ws => (
                  <WebSourceCard key={ws.id} source={ws} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EvalDashboard />
        )}
      </div>
    </div>
  );
}
