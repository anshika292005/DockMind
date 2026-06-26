import React from 'react';
import { FileText, Copy, Check, Clock } from 'lucide-react';
import { ThinkingAnimation } from './ThinkingAnimation';

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ message, onCitationClick, timestamp }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-surface border border-border text-text-primary rounded-2xl rounded-tr-sm px-4 py-3'
            : 'text-text-primary w-full'
        } ${message.isError ? 'opacity-90' : ''}`}
      >
        {/* Thinking Animation — only before any content arrives */}
        {!isUser && message.isStreaming && message.content.length === 0 && (
          <ThinkingAnimation />
        )}

        {/* Content */}
        {message.content && (
          <div className={`prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap ${
            message.isError ? 'text-red-400' : ''
          }`}>
            {message.content}
          </div>
        )}

        {/* Streaming Animation below partial content */}
        {!isUser && message.isStreaming && message.content.length > 0 && (
          <div className="mt-2">
            <ThinkingAnimation />
          </div>
        )}

        {/* Copy button and timestamp for assistant messages */}
        {!isUser && !message.isStreaming && message.content && !message.isError && (
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <Check size={12} className="text-teal" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {timestamp && (
              <span className="flex items-center gap-1 text-[10px] text-text-muted opacity-0 group-hover:opacity-60 transition-opacity">
                <Clock size={10} />{formatTime(timestamp)}
              </span>
            )}
          </div>
        )}

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && !message.isStreaming && (
          <div className="flex flex-wrap gap-2 mt-4">
            {message.citations.map((cit, idx) => (
              <button
                key={idx}
                onClick={() => onCitationClick && onCitationClick(cit)}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-teal/30 bg-teal/10 hover:bg-teal/20 text-teal text-xs font-mono transition-colors"
              >
                <FileText size={12} />
                <span>{cit.filename || cit.chunk_excerpt?.slice(0, 20)} · p.{cit.page}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
