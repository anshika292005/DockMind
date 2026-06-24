import React from 'react';

export function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-surface border border-border rounded-lg ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.id 
              ? 'bg-border text-text-primary shadow-sm' 
              : 'text-text-muted hover:text-text-primary hover:bg-base'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
