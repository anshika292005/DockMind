import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const baseClasses = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
  const variants = {
    default: "bg-border text-text-muted",
    violet: "bg-violet/20 text-violet border border-violet/30",
    teal: "bg-teal/20 text-teal border border-teal/30",
    red: "bg-red-500/20 text-red-400 border border-red-500/30",
  };
  
  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
