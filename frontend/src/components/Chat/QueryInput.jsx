import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export function QueryInput({ query, setQuery, onSend, disabled, placeholder = 'Ask anything about your documents...' }) {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    // Enter without shift sends the message; Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && query.trim()) onSend();
      return;
    }
    // Also support Cmd/Ctrl+Enter for power users
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Max 4 lines (approx 96px)
      textareaRef.current.style.height = `${Math.min(scrollHeight, 96)}px`;
    }
  }, [query]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-surface border border-border rounded-lg pl-4 pr-12 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet/50 resize-none overflow-y-auto min-h-[46px]"
        rows={1}
        disabled={disabled}
      />
      <button
        onClick={onSend}
        disabled={!query.trim() || disabled}
        className="absolute right-2 bottom-2 p-1.5 bg-violet hover:bg-violet/90 text-white rounded disabled:opacity-50 disabled:hover:bg-violet transition-colors"
      >
        <Send size={16} />
      </button>
      {query.length > 0 && (
        <p className="absolute -bottom-5 right-1 text-[10px] text-text-muted select-none">
          Enter to send · Shift+Enter for newline
        </p>
      )}
    </div>
  );
}
