import React from 'react';
import { Menu, PanelRight, Sparkles, Settings } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function TopBar({ onToggleSidebar, onToggleSources, onOpenSettings }) {
  return (
    <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-text-muted hover:text-text-primary transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="text-violet" size={20} />
          <span className="font-semibold text-lg tracking-tight">
            DocMind <span className="text-violet">AI</span>
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <Badge variant="default" className="border border-border font-mono text-[11px]">
          Llama 3.3 70B · Groq
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-border rounded transition-colors"
        >
          <Settings size={17} />
        </button>

        {/* Mobile: toggle sources */}
        <button
          onClick={onToggleSources}
          className="lg:hidden text-text-muted hover:text-text-primary transition-colors p-1.5"
        >
          <PanelRight size={20} />
        </button>

        {/* Desktop: View Eval button */}
        <button
          onClick={onToggleSources}
          className="hidden lg:flex px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-border text-text-primary transition-colors"
        >
          View Eval
        </button>
      </div>
    </div>
  );
}
