import React from 'react';

export function ProgressBar({ progress, className = '', colorClass = 'bg-violet' }) {
  // progress between 0 and 1
  const percent = Math.min(100, Math.max(0, progress * 100));
  
  return (
    <div className={`w-full bg-border rounded-full h-1.5 overflow-hidden ${className}`}>
      <div 
        className={`h-full ${colorClass} transition-all duration-300 ease-in-out`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
